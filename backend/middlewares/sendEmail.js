import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, html) => {
    try {
        // Configure transporter (use your SMTP provider or Gmail app password)
        const transporter = nodemailer.createTransport({
            service: "gmail", // or use host/port if using custom SMTP
            auth: {
                user: "learnforyourself1509@gmail.com",
                pass: "jjxf eyzu bnmx bhzr"
            },
        });

        const mailOptions = {
            from: `"NGO Connect" <${process.env.SMTP_EMAIL}>`,
            to,
            subject,
            html,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}`);
    } catch (error) {
        console.error("❌ Email send error:", error);
    }
};
