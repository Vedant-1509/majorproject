import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Ngo from "../models/ngo.model.js";
import NgoDocument from "../models/NgoDocument.model.js";
import Campaign from "../models/campaign.model.js";
import Report from "../models/report.model.js";
import User from "../models/user.model.js";
import axios from "axios";
import { NGO_STATUS } from "../constants/ngoStatus.js";
import { sendEmail } from "../middlewares/sendEmail.js";

export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, bootstrapKey } = req.body;

    if (!name || !email || !password || !bootstrapKey) {
      return res.status(400).json({
        message: "Name, email, password and bootstrapKey are required"
      });
    }

    // 🔒 HARD GATE — protects admin creation
    if (bootstrapKey !== process.env.ADMIN_BOOTSTRAP_KEY) {
      return res.status(403).json({
        message: "Invalid bootstrap key"
      });
    }

    // ❌ Prevent creating multiple admins (important)
    const existingAdmin = await User.findOne({
      role: { $in: ["admin", "superadmin"] }
    });

    if (existingAdmin) {
      return res.status(403).json({
        message: "Admin already exists"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: "admin"
    });

    await admin.save();

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully"
    });

  } catch (error) {
    console.error("Admin Register Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};//done

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await User.findOne({
      email,
      role: { $in: ["admin", "superadmin"] }
    }).select("+password");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ JWT TOKEN
    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    });

  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};//done

export const getPendingNGOs = async (req, res) => {
  try {
    const ngos = await Ngo.find({
      status: NGO_STATUS.DOCUMENTS_SUBMITTED
    }).lean();

    const ngoIds = ngos.map(n => n._id);

    const documents = await NgoDocument.find({
      ngoId: { $in: ngoIds }
    }).lean();

    const ngosWithDocs = ngos.map(ngo => {
      const ngoDocs = documents.find(
        doc => doc.ngoId.toString() === ngo._id.toString()
      );
      return { ...ngo, documents: ngoDocs || null };
    });

    res.json({ success: true, ngos: ngosWithDocs });
  } catch (error) {
    console.error("Error fetching pending NGOs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};//done


export const verifyNGO = async (req, res) => {
  try {
    const ngo = await Ngo.findByIdAndUpdate(
      req.params.ngoId,
      {
        status: NGO_STATUS.APPROVED,
        verifiedByAdmin: true,
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!ngo) {
      return res.status(404).json({ message: "NGO not found" });
    }

    await NgoDocument.findOneAndUpdate(
      { ngoId: req.params.ngoId },
      { status: NGO_STATUS.APPROVED }
    );

    // 🔗 Dashboard link (move to env in production)
    const dashboard_link = "http://localhost:3000/ngo-dashboard";

    // ✉️ Approval email HTML
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Approved - NGO Connect</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h1 style="color: #27ae60; text-align: center;">
                  🎉 Congratulations, ${ngo.name}!
              </h1>

              <p>We’re happy to inform you that your NGO registration has been
                 <strong style="color: #27ae60;">successfully approved</strong>.
              </p>

              <p>You are now an official part of the <strong>NGO Connect</strong> platform.</p>

              <h3>What’s next?</h3>
              <p>You can now access your NGO dashboard to manage your profile and campaigns.</p>

              <div style="text-align: center; margin: 25px 0;">
                  <a href="${dashboard_link}"
                     style="padding: 12px 25px; background-color: #27ae60; color: #fff;
                            text-decoration: none; border-radius: 5px; font-weight: bold;">
                      Go to NGO Dashboard
                  </a>
              </div>

              <p>If you have any questions, feel free to reach out to us.</p>

              <p style="margin-top: 30px;">
                  Best regards,<br/>
                  <strong>The NGO Connect Team</strong>
              </p>
          </div>
      </body>
      </html>
    `;

    // 📧 Send email (non-blocking)
    try {
      await sendEmail(ngo.email, "NGO Approval Confirmation", html);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr.message);
    }

    res.json({
      success: true,
      message: "NGO approved successfully and email sent",
      ngo
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};//done

// export const rejectNGO = async (req, res) => {
//   try {
//     const ngo = await Ngo.findByIdAndUpdate(
//       req.params.ngoId,
//       { status: "rejected" },
//     );

//     if (!ngo) return res.status(404).json({ message: "NGO not found" });

//     const remarks = req.body?.remarks || "Rejected by admin";

//     await NgoDocument.findOneAndUpdate(
//       { ngoId: req.params.ngoId },
//       { status: "rejected", remarks }
//     );

//     // ✉️ Send rejection email
//     const html = `
//       <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Registration Update from NGO Connect</title>
// </head>
// <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">

//     <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">

//         <h2 style="color: #c0392b; border-bottom: 2px solid #eee; padding-bottom: 10px;">
//             An Update on Your NGO Registration
//         </h2>

//         <p>Dear **${ngo.name}**,</p>

//         <p>
//             Thank you for submitting your registration application to NGO Connect. We sincerely appreciate your efforts and commitment to your important work.
//         </p>

//         <p>
//             After a thorough review, we regret to inform you that your current application for NGO registration has been <strong style="color: #c0392b; font-size: 1.1em;">unsuccessful</strong> at this time.
//         </p>

//         <div style="margin: 20px 0; padding: 15px; background-color: #fceae9; border-left: 5px solid #c0392b; border-radius: 4px;">
//             <p style="margin: 0;"><strong>Remarks from the Review Team:</strong></p>
//             <p style="margin-top: 5px; font-style: italic;">${remarks}</p>
//         </div>

//         <p>
//             We strongly encourage you to review the remarks and make the necessary adjustments to your application. You are welcome to **reapply** at any time.
//         </p>

//         <p>
//             If you believe this decision is due to an error, please contact our support team immediately so we can look into the matter.
//         </p>

//         <p style="margin-top: 30px;">
//             Best regards,<br/>
//             The NGO Connect Team
//         </p>

//     </div>

// </body>
// </html>
//     `;
//     await sendEmail(ngo.email, "NGO Registration Rejected", html);

//     res.json({ success: true, message: "NGO rejected and email sent", ngo });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const rejectNGO = async (req, res) => {
  try {
    const { ngoId } = req.params;
    const remarks = req.body?.remarks || "Rejected by admin";

    const ngo = await Ngo.findByIdAndUpdate(
      ngoId,
      { status: NGO_STATUS.REJECTED },
      { new: true }
    );

    if (!ngo) {
      return res.status(404).json({ message: "NGO not found" });
    }

    await NgoDocument.findOneAndUpdate(
      { ngoId },
      { status: NGO_STATUS.REJECTED, remarks }
    );

    // ✉️ Rejection email HTML
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>NGO Registration Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h2 style="color: #c0392b;">
                  NGO Registration Status Update
              </h2>

              <p>Dear <strong>${ngo.name}</strong>,</p>

              <p>
                  Thank you for applying to NGO Connect. After careful review,
                  we regret to inform you that your NGO registration has been
                  <strong style="color: #c0392b;">rejected</strong>.
              </p>

              <div style="margin: 20px 0; padding: 15px; background-color: #fceae9; border-left: 5px solid #c0392b;">
                  <p style="margin: 0;"><strong>Remarks:</strong></p>
                  <p style="font-style: italic;">${remarks}</p>
              </div>

              <p>
                  You may review the remarks and reapply after making the necessary changes.
              </p>

              <p style="margin-top: 30px;">
                  Regards,<br/>
                  <strong>NGO Connect Team</strong>
              </p>
          </div>
      </body>
      </html>
    `;

    // 📧 Email should NOT break rejection
    try {
      await sendEmail(ngo.email, "NGO Registration Rejected", html);
    } catch (emailErr) {
      console.error("Rejection email failed:", emailErr.message);
    }

    res.json({
      success: true,
      message: "NGO rejected successfully and email sent",
      ngo
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};//done


// Get all NGOs
export const getAllNGOs = async (req, res) => {
  try {
    const ngos = await Ngo.find();
    res.json({ success: true, ngos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getApprovedNGOs = async (req, res) => {
  try {
    const ngos = await Ngo.find({ status:NGO_STATUS.APPROVED});
    res.json({ success: true, ngos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRejectedNGOs = async (req, res) => {
  try {
    const ngos = await Ngo.find({ status: "rejected" });
    res.json({ success: true, ngos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const disableCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.campaignId,
      { isActive: false, status: "disabled" },
      { new: true }
    );
    if (!campaign)
      return res.status(404).json({ success: false, message: "Campaign not found" });

    res.json({ success: true, message: "Campaign disabled successfully", campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all user reports (for admin moderation)
export const getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("campaignId", "title ngoId")
      .populate("reporterId", "name email");

    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

