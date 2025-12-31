import bcrypt from "bcrypt";
import crypto from "crypto";
import Ngo from "../models/ngo.model.js";
import NgoDocument from "../models/NgoDocument.model.js";
import Campaign from "../models/campaign.model.js";
import Report from "../models/report.model.js";
import User from "../models/user.model.js";
import axios from "axios";
import { sendEmail } from "../middlewares/sendEmail.js";



export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !password || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({
      $or: [{ email }]
    });

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "admin"
    });

    await newUser.save();


    return res.status(201).json({ message: "User created successfully" });

  } catch (error) {
    console.log("BODY:", req.body);
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}





export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const admin = await User.findOne({ email, role: { $in: ["admin", "superadmin"] } });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Generate and store token
    const token = crypto.randomBytes(32).toString("hex");
    admin.token = token;
    await admin.save();

    res.json({
      success: true,
      message: "Login successful",
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      token,
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}


export const getPendingNGOs = async (req, res) => {
  try {
    // Find pending NGOs
    const ngos = await Ngo.find({ status: "pending" })
      .lean(); // lean() gives plain JSON for easier merging

    // Get all documents linked to these NGOs
    const ngoIds = ngos.map((n) => n._id);
    const documents = await NgoDocument.find({ ngoId: { $in: ngoIds } }).lean();

    // Merge NGOs with their documents
    const ngosWithDocs = ngos.map((ngo) => {
      const ngoDocs = documents.find(
        (doc) => doc.ngoId.toString() === ngo._id.toString()
      );
      return { ...ngo, documents: ngoDocs || null };
    });

    res.json({ success: true, ngos: ngosWithDocs });
  } catch (error) {
    console.error("Error fetching pending NGOs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify NGO details via Darpan API
export const verifyNGOByDarpan = async (req, res) => {
  try {
    const { urn } = req.params;
    const response = await axios.get(`https://ngodarpan.gov.in/api/ngo_details/${urn}`);
    const ngoData = response.data;

    if (!ngoData || !ngoData.ngo_name)
      return res.status(404).json({ success: false, message: "No NGO found with given URN" });

    res.json({ success: true, ngoData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to verify NGO via Darpan API",
      error: error.message,
    });
  }
};

// Approve an NGO after verifying documents

// export const verifyNGO = async (req, res) => {
//   try {
//     const ngo = await Ngo.findByIdAndUpdate(
//       req.params.ngoId,
//       { status: "approved", verifiedByAdmin: true, approvedAt: new Date() },
//       { new: true }
//     );

//     if (!ngo) return res.status(404).json({ message: "NGO not found" });

//     await NgoDocument.findOneAndUpdate(
//       { ngoId: req.params.ngoId },
//       { status: "approved" }
//     );

//     // ✉️ Send approval email
//     const html = `
//       <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Registration Approved! - NGO Connect</title>
// </head>
// <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">

//     <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">

//         <h1 style="color: #27ae60; text-align: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 15px; margin-bottom: 20px;">
//             🎉 Congratulations, ${ngo.name}!
//         </h1>

//         <p style="font-size: 1.1em;">
//             We have fantastic news to share!
//         </p>

//         <div style="margin: 25px 0; padding: 20px; background-color: #e8f5e9; border-left: 5px solid #27ae60; border-radius: 4px; text-align: center;">
//             <p style="margin: 0; font-size: 1.2em; color: #1e8449;">
//                 Your **NGO registration** has been <strong style="color: #27ae60; font-size: 1.3em;">officially APPROVED!</strong>
//             </p>
//         </div>

//         <p>
//             Welcome to the NGO Connect community! We are thrilled to partner with you and support the incredible work your organization is doing.
//         </p>

//         <h3 style="color: #34495e;">What's Next?</h3>

//         <p>
//             You can now log in to your dedicated **NGO Dashboard** to start managing your profile and maximizing your impact.
//         </p>

//         <div style="text-align: center; margin: 30px 0;">
//             <a href="${dashboard_link}" style="display: inline-block; padding: 12px 25px; background-color: #27ae60; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
//                 Go to Your Dashboard & Start Creating Campaigns
//             </a>
//         </div>
        
//         <p style="margin-top: 20px;">
//             If you have any questions or need assistance getting started, please don't hesitate to reach out.
//         </p>

//         <p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
//             Best regards,<br/>
//             The NGO Connect Team
//         </p>

//     </div>

// </body>
// </html>
//     `;
//     await sendEmail(ngo.email, "NGO Approval Confirmation", html);

//     res.json({ success: true, message: "NGO approved successfully and email sent", ngo });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const verifyNGO = async (req, res) => {
  try {
    const ngo = await Ngo.findByIdAndUpdate(
      req.params.ngoId,
      { status: "approved", verifiedByAdmin: true, approvedAt: new Date() },
      { new: true }
    );

    if (!ngo) return res.status(404).json({ message: "NGO not found" });

    await NgoDocument.findOneAndUpdate(
      { ngoId: req.params.ngoId },
      { status: "approved" }
    );

    // 🔗 Define dashboard link properly
    const dashboard_link = "http://localhost:3000/ngo-dashboard";

    // ✉️ Approval email HTML
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Approved! - NGO Connect</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
              <h1 style="color: #27ae60; text-align: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 15px; margin-bottom: 20px;">
                  🎉 Congratulations, ${ngo.name}!
              </h1>
              <p style="font-size: 1.1em;">We have fantastic news to share!</p>
              <div style="margin: 25px 0; padding: 20px; background-color: #e8f5e9; border-left: 5px solid #27ae60; border-radius: 4px; text-align: center;">
                  <p style="margin: 0; font-size: 1.2em; color: #1e8449;">
                      Your <strong>NGO registration</strong> has been 
                      <strong style="color: #27ae60; font-size: 1.3em;">officially APPROVED!</strong>
                  </p>
              </div>
              <p>Welcome to the NGO Connect community! We are thrilled to partner with you and support the incredible work your organization is doing.</p>
              <h3 style="color: #34495e;">What's Next?</h3>
              <p>You can now log in to your dedicated <strong>NGO Dashboard</strong> to start managing your profile and maximizing your impact.</p>
              <div style="text-align: center; margin: 30px 0;">
                  <a href="${dashboard_link}" style="display: inline-block; padding: 12px 25px; background-color: #27ae60; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                      Go to Your Dashboard & Start Creating Campaigns
                  </a>
              </div>
              <p style="margin-top: 20px;">If you have any questions or need assistance getting started, please don't hesitate to reach out.</p>
              <p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
                  Best regards,<br/>
                  The NGO Connect Team
              </p>
          </div>
      </body>
      </html>
    `;

    try {
      await sendEmail(ngo.email, "NGO Approval Confirmation", html);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr.message);
    }

    res.json({ success: true, message: "NGO approved successfully and email sent", ngo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const rejectNGO = async (req, res) => {
  try {
    const ngo = await Ngo.findByIdAndUpdate(
      req.params.ngoId,
      { status: "rejected" },
    );

    if (!ngo) return res.status(404).json({ message: "NGO not found" });

    const remarks = req.body?.remarks || "Rejected by admin";

    await NgoDocument.findOneAndUpdate(
      { ngoId: req.params.ngoId },
      { status: "rejected", remarks }
    );

    // ✉️ Send rejection email
    const html = `
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Update from NGO Connect</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">

    <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">

        <h2 style="color: #c0392b; border-bottom: 2px solid #eee; padding-bottom: 10px;">
            An Update on Your NGO Registration
        </h2>

        <p>Dear **${ngo.name}**,</p>

        <p>
            Thank you for submitting your registration application to NGO Connect. We sincerely appreciate your efforts and commitment to your important work.
        </p>

        <p>
            After a thorough review, we regret to inform you that your current application for NGO registration has been <strong style="color: #c0392b; font-size: 1.1em;">unsuccessful</strong> at this time.
        </p>

        <div style="margin: 20px 0; padding: 15px; background-color: #fceae9; border-left: 5px solid #c0392b; border-radius: 4px;">
            <p style="margin: 0;"><strong>Remarks from the Review Team:</strong></p>
            <p style="margin-top: 5px; font-style: italic;">${remarks}</p>
        </div>

        <p>
            We strongly encourage you to review the remarks and make the necessary adjustments to your application. You are welcome to **reapply** at any time.
        </p>

        <p>
            If you believe this decision is due to an error, please contact our support team immediately so we can look into the matter.
        </p>

        <p style="margin-top: 30px;">
            Best regards,<br/>
            The NGO Connect Team
        </p>

    </div>

</body>
</html>
    `;
    await sendEmail(ngo.email, "NGO Registration Rejected", html);

    res.json({ success: true, message: "NGO rejected and email sent", ngo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    const ngos = await Ngo.find({ status: "approved" });
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


/* =============================
   DASHBOARD ANALYTICS
   ============================= */

export const getDashboardStats = async (req, res) => {
  try {
    const totalNGOs = await Ngo.countDocuments();
    const pendingNGOs = await Ngo.countDocuments({ status: "pending" });
    const approvedNGOs = await Ngo.countDocuments({ status: "approved" });
    const activeCampaigns = await Campaign.countDocuments({ isActive: true });
    const disabledCampaigns = await Campaign.countDocuments({ status: "disabled" });
    const totalReports = await Report.countDocuments();

    res.json({
      success: true,
      data: {
        totalNGOs,
        pendingNGOs,
        approvedNGOs,
        activeCampaigns,
        disabledCampaigns,
        totalReports,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
