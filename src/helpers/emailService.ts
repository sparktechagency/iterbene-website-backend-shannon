import colors from 'colors';
import nodemailer from 'nodemailer';
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import { config } from '../config';

// // Create Nodemailer transporter with better configuration
// const transporter = nodemailer.createTransport({
//   host: config.smtp.host,
//   port: Number(config.smtp.port),
//   secure: false,
//   auth: {
//     user: config.smtp.username,
//     pass: config.smtp.password,
//   },
//   // Add these for better deliverability
//   tls: {
//     rejectUnauthorized: false,
//   },
//   debug: true,
//   logger: true,
// });

// // Verify transporter connection
// if (config.environment !== 'test') {
//   transporter
//     .verify()
//     .then(() => logger.info(colors.cyan('📧  Connected to email server')))
//     .catch(err => {
//       logger.error('Unable to connect to email server:', err);
//       logger.warn(
//         'Unable to connect to email server. Make sure you have configured the SMTP options in .env'
//       );
//     });
// }

// // Function to send email with better error handling
// const sendEmail = async (values: ISendEmail) => {
//   try {
//     const info = await transporter.sendMail({
//       from: `"Iter Bene" <${config.smtp.emailFrom}>`, // Better sender format
//       to: values.to,
//       subject: values.subject,
//       html: values.html,
//       // Add these headers for better deliverability
//       headers: {
//         'X-Priority': '1',
//         'X-MSMail-Priority': 'High',
//         Importance: 'high',
//       },
//     });
//     logger.info('Mail sent successfully', info.accepted);
//     return info;
//   } catch (error) {
//     console.error('Email sending failed:', error);
//     errorLogger.error('Email sending error:', error);
//     throw error; // Re-throw to handle in calling function
//   }
// };

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: Number(config.smtp.port),
  secure: true,
  auth: {
    user: config.smtp.username,
    pass: config.smtp.password,
  },
});

// Verify transporter connection
if (config.environment !== 'test') {
  transporter
    .verify()
    .then(() => logger.info(colors.cyan('📧  Connected to email server')))
    .catch(err =>
      logger.warn(
        'Unable to connect to email server. Make sure you have configured the SMTP options in .env'
      )
    );
}

// Function to send email
const sendEmail = async (values: ISendEmail) => {
  try {
    const info = await transporter.sendMail({
      from: `Shannon Lawrence-Montes <${config.smtp.emailFrom}>`,
      to: values.to,
      subject: values.subject,
      html: values.html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'high',
      },
    });
    logger.info('Mail sent successfully', info.accepted);
  } catch (error) {
    errorLogger.error('Email', error);
  }
};

const sendVerificationEmail = async (to: string, otp: string) => {
  const subject = 'Iter Bene - Verify Your Email Address';
  const html = `
  <div style="width: 100%; background: #f4f4f4; margin: 0 auto; font-family: Inter, sans-serif; text-align: center;  padding: 50px 0px;">
   <img
    src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/iterbenelogo.png"
    alt="Logo"
    style="width: 80px; margin-bottom: 20px"
  />
  <table style="width: 100%; background: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid rgb(216, 212, 212); box-shadow: 5px #ffffff; border-radius: 10px; padding: 20px;">
    <tr>
      <td>
        <h1 style="font-size: 22px; color: black; font-weight: 400">Here’s your verification code</h1>
        <h1 style="font-size: 30px; color: rgb(46, 44, 44); font-weight: 400; letter-spacing: 5px; margin: 30px 0px;">
          ${otp}
        </h1>
        <h1 style="font-size: 16px; color: rgb(46, 44, 44); font-weight: 400; margin: 20px 0px;">
          To verify your account, just enter this code in your app. The code expires in 30 minutes and you can only use it once.
        </h1>
        <h1 style="font-size: 14px; color: rgb(46, 44, 44); font-weight: 400; margin: 20px 0px;">
          This code is unique to you. Please don’t share it with anyone.
        </h1>
      </td>
    </tr>
  </table>
  <div style="text-align: center; margin-top: 20px;">
    <h1 style="font-size: 14px; font-weight: 300">Follow Us:</h1>
    <table style="margin-top: 20px; display: inline-block; text-align: center;">
      <tr>
        <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/facebook.logo.png"
                alt="facebook"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/instagram.logo.png"
                alt="instagram"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/twitter.logo.jpg"
                alt="twitter"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/youtube+logo.webp"
                alt="youtube"
                width="20px"
              />
            </a>
          </td>
      </tr>
    </table>
  </div>
</div>
  `;
  await sendEmail({ to, subject, html });
};

const sendResetPasswordEmail = async (to: string, otp: string) => {
  const subject = 'Iter Bene - Reset Your Password';
  const html = `
  <div style="width: 100%; background: #f4f4f4; margin: 0 auto; font-family: Inter, sans-serif; text-align: center;  padding: 50px 0px;">
   <img
    src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/iterbenelogo.png"
    alt="Logo"
    style="width: 80px; margin-bottom: 20px"
  />
  <table style="width: 100%; background: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid rgb(216, 212, 212); box-shadow: 5px #ffffff; border-radius: 10px; padding: 20px;">
    <tr>
      <td>
        <h1 style="font-size: 22px; color: black; font-weight: 400">Here’s your reset password code</h1>
        <h1 style="font-size: 30px; color: rgb(46, 44, 44); font-weight: 400; letter-spacing: 5px; margin: 30px 0px;">
          ${otp}
        </h1>
        <h1 style="font-size: 16px; color: rgb(46, 44, 44); font-weight: 400; margin: 20px 0px;">
          To verify your email, just enter this code in your app. The code expires in 30 minutes and you can only use it once.
        </h1>
        <h1 style="font-size: 14px; color: rgb(46, 44, 44); font-weight: 400; margin: 20px 0px;">
          This code is unique to you. Please don’t share it with anyone.
        </h1>
      </td>
    </tr>
  </table>
  <div style="text-align: center; margin-top: 20px;">
    <h1 style="font-size: 14px; font-weight: 300">Follow Us:</h1>
        <table style="margin-top: 20px; display: inline-block; text-align: center;">
      <tr>
        <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/facebook.logo.png"
                alt="facebook"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/instagram.logo.png"
                alt="instagram"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/twitter.logo.jpg"
                alt="twitter"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/youtube+logo.webp"
                alt="youtube"
                width="20px"
              />
            </a>
          </td>
      </tr>
    </table>
  </div>
</div>
  `;
  await sendEmail({ to, subject, html });
};

// send login verification email
const sendLoginVerificationEmail = async (to: string, otp: string) => {
  const subject = 'Iter Bene - Verify Your Login';
  const html = `
  <div style="width: 100%; background: #f4f4f4; margin: 0 auto; font-family: Inter, sans-serif; text-align: center; padding: 50px 0px;">
   <img
    src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/iterbenelogo.png"
    alt="Logo"
    style="width: 80px; margin-bottom: 20px"
  />
  <table style="width: 100%; background: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid rgb(216, 212, 212); box-shadow: 5px #ffffff; border-radius: 10px; padding: 20px;">
    <tr>
      <td>
        <h1 style="font-size: 22px; color: black; font-weight: 400">Your login verification code</h1>
        <h1 style="font-size: 30px; color: rgb(46, 44, 44); font-weight: 400; letter-spacing: 5px; margin: 30px 0px;">
          ${otp}
        </h1>
        <h1 style="font-size: 16px; color: rgb(46, 44, 44); font-weight: 400; margin: 20px 0px;">
          To complete your login, please enter this code in the app. The code expires in 30 minutes and can only be used once.
        </h1>
        <h1 style="font-size: 14px; color: rgb(46, 44, 44); font-weight: 400; margin: 20px 0px;">
          This code is unique to you. Please don’t share it with anyone.
        </h1>
      </td>
    </tr>
  </table>
  <div style="text-align: center; margin-top: 20px;">
    <h1 style="font-size: 14px; font-weight: 300">Follow Us:</h1>
    <table style="margin-top: 20px; display: inline-block; text-align: center;">
      <tr>
        <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/facebook.logo.png"
                alt="facebook"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/instagram.logo.png"
                alt="instagram"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/twitter.logo.jpg"
                alt="twitter"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/youtube+logo.webp"
                alt="youtube"
                width="20px"
              />
            </a>
          </td>
      </tr>
    </table>
  </div>
</div>
  `;
  await sendEmail({ to, subject, html });
};

const sendWelcomeEmail = async (to: string, password: string) => {
  const subject = 'Iter Bene - Welcome to the Platform!';
  const html = `
     <div
      style="
        width: 100%;
        background: #f4f4f4;
        margin: 0 auto;
        font-family: Inter, sans-serif;
        text-align: center;
        padding: 50px 0px;
      "
    >
      <img
        src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/iterbenelogo.png"
        alt="Logo"
        style="width: 80px; margin-bottom: 20px"
      />
      <table
        style="
          width: 100%;
          background: #ffffff;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid rgb(216, 212, 212);
          box-shadow: 5px #ffffff;
          border-radius: 10px;
          padding: 20px;
        "
      >
        <tr>
          <td>
            <h1 style="color: rgb(37, 36, 36);">Welcome to Iter Bene!</h1>
            <p style="font-size: 16px;">
              Your password is: <strong>${password}</strong>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
  await sendEmail({ to, subject, html });
};

// Function to send Admin/SuperAdmin Creation Email
const sendAdminOrSuperAdminCreationEmail = async (
  email: string,
  role: string,
  password: string,
  message?: string // Optional custom message
) => {
  const subject = `Iter Bene - Congratulations! You are now an ${role}`;
  const html = `
     <div
      style="
        width: 100%;
        background: #f4f4f4;
        margin: 0 auto;
        font-family: Inter, sans-serif;
        text-align: center;
        padding: 50px 0px;
      "
    >
      <img
        src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/iterbenelogo.png"
        alt="Logo"
        style="width: 80px; margin-bottom: 20px"
      />
      <table
        style="
          width: 100%;
          background: #ffffff;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid rgb(216, 212, 212);
          box-shadow: 5px #ffffff;
          border-radius: 10px;
          padding: 20px;
        "
      >
        <tr>
          <td>
            <h2>Welcome to Iter Bene!</h2>
            <p>
              Congratulations! You've been granted the role of
              <strong>${role}</strong> in our system.
            </p>
            <p>To get started, please use the following credentials:</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Note:</strong> ${message}</p>
            <p style="margin-top: 30px;">
              Feel free to reach out if you have any questions or need
              assistance. We're excited to have you on board!
            </p>
            <p style="margin-top: 30px;">Best regards,<br />The Iter Bene Team</p>
          </td>
        </tr>
      </table>
      <div style="text-align: center; margin-top: 20px">
        <h1 style="font-size: 14px; font-weight: 300">Follow Us:</h1>
        <table
          style="margin-top: 20px; display: inline-block; text-align: center"
        >
          <tr style="display: inline-flex; gap: 10px">
            <td
              style="
                padding: 10px;
                border: 1px solid gray;
                border-radius: 5px;
                background: #ffffff;
              "
            >
              <a
                href="http://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/facebook.logo.png"
                  alt="facebook"
                  width="20px"
                />
              </a>
            </td>
            <td
              style="
                padding: 10px;
                border: 1px solid gray;
                border-radius: 5px;
                background: #ffffff;
              "
            >
              <a
                href="http://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/instagram.logo.png"
                  alt="facebook"
                  width="20px"
                />
              </a>
            </td>
            <td
              style="
                padding: 10px;
                border: 1px solid gray;
                border-radius: 5px;
                background: #ffffff;
              "
            >
              <a
                href="http://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://github.com/rakibislam2233/Image-Server/blob/main/instagram.logo.png?raw=true"
                  alt="instagram"
                  width="20px"
                />
              </a>
            </td>
            <td
              style="
                padding: 10px;
                border: 1px solid gray;
                border-radius: 5px;
                background: #ffffff;
              "
            >
              <a
                href="http://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://raw.githubusercontent.com/rakibislam2233/Image-Server/refs/heads/main/youtube%20logo.webp"
                  alt="youtube"
                  width="20px"
                />
              </a>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;

  await sendEmail({ to: email, subject, html });
};

const sendSupportMessageEmail = async (
  userEmail: string,
  userName: string,
  message: string
) => {
  const adminEmail = config.smtp.emailFrom; // Admin email from config
  const html = `
   <div style="width: 100%; background: #f4f4f4; margin: 0 auto; font-family: Inter, sans-serif; text-align: center;  padding: 50px 0px;">
      <img
       src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/iterbenelogo.png"
       alt="Logo"
       style="width: 80px; margin-bottom: 20px"
     />
     <table style="width: 100%; background: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid rgb(216, 212, 212); box-shadow: 5px #ffffff; border-radius: 10px; padding: 20px;">
       <tr>
         <td>
           <h1 style="color: rgb(37, 36, 36);">New Support Message</h1>
           <p style="font-size: 16px;"><strong>From:</strong> ${userName} (${userEmail})</p>
           <p style="font-size: 16px;">${message}</p>
         </td>
       </tr>
     </table>
     </div>
  `;

  await sendEmail({
    to: adminEmail || '',
    subject: `Support Request from ${userName}`,
    html,
  });
};

const sendWarningEmail = async (
  to: string,
  userName: string,
  warningMessage: string
) => {
  const subject = 'Iter Bene - Important Warning Notification';
  const html = `
        <div
      style="
        width: 100%;
        background: #f4f4f4;
        margin: 0 auto;
        font-family: Inter, sans-serif;
        text-align: center;
        padding: 50px 0px;
      "
    >
      <img
        src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/iterbenelogo.png"
        alt="Logo"
        style="width: 80px; margin-bottom: 20px"
      />
      <table
        style="
          width: 100%;
          background: #ffffff;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid rgb(216, 212, 212);
          box-shadow: 5px #ffffff;
          border-radius: 10px;
          padding: 20px;
        "
      >
        <tr>
          <td>
          <h1 style="font-size: 22px; color: red; margin-bottom: 40px;">Warning Notification from Iter Bene</h1>
          <p style="font-size: 16px;">Dear User ${userName},</p>
          <p style="font-size: 16px;">We have reviewed your recent activity on the Iter Bene platform and found that it violates our community guidelines. Please review the details below:</p>
         <div style="background-color: #FFE6E6; padding: 15px; border-radius: 10px; margin: 20px 0;">
          <p style="font-size: 16px; color: #D32F2F; text-align: center;"><strong>⚠️ Warning:</strong> ${warningMessage}</p>
         </div>
         <p style="font-size: 14px; text-align: center; margin-top: 30px;">
          If you continue to violate our guidelines, further actions such as account suspension may be taken. Please ensure you follow our terms of service.
         </p>
          </td>
        </tr>
      </table>
      <div style="text-align: center; margin-top: 20px">
        <h1 style="font-size: 14px; font-weight: 300">Follow Us:</h1>
            <table style="margin-top: 20px; display: inline-block; text-align: center;">
      <tr>
        <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/facebook.logo.png"
                alt="facebook"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/instagram.logo.png"
                alt="instagram"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/twitter.logo.jpg"
                alt="twitter"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/youtube+logo.webp"
                alt="youtube"
                width="20px"
              />
            </a>
          </td>
      </tr>
    </table>
      </div>
    </div>   
  `;

  await sendEmail({ to, subject, html });
};

const sendBanNotificationEmail = async (
  to: string,
  userName: string,
  banMessage: string,
  banUntil: Date | null
) => {
  const subject = 'Important: Your Account Has Been Banned';
  const formattedBanUntil = banUntil ? banUntil.toUTCString() : 'Permanently';

  const html = `
    <div
      style="
        width: 100%;
        background: #f4f4f4;
        margin: 0 auto;
        font-family: Inter, sans-serif;
        text-align: center;
        padding: 50px 0px;
      "
    >
      <img
        src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/iterbenelogo.png"
        alt="Logo"
        style="width: 80px; margin-bottom: 20px"
      />
      <table
        style="
          width: 100%;
          background: #ffffff;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid rgb(216, 212, 212);
          box-shadow: 5px #ffffff;
          border-radius: 10px;
          padding: 20px;
        "
      >
        <tr>
          <td>
            <h1 style="color: #d32f2f">Account Ban Notification</h1>
            <p style="font-size: 16px">Dear <strong>${userName}</strong>,</p>
            <p style="font-size: 16px">${banMessage}</p>
            <p style="font-size: 16px">
              <strong>Ban Expiry:</strong> ${formattedBanUntil}
            </p>
          </td>
        </tr>
      </table>
      <div style="text-align: center; margin-top: 20px">
        <h1 style="font-size: 14px; font-weight: 300">Follow Us:</h1>
           <table style="margin-top: 20px; display: inline-block; text-align: center;">
      <tr>
        <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/facebook.logo.png"
                alt="facebook"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/instagram.logo.png"
                alt="instagram"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/twitter.logo.jpg"
                alt="twitter"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/youtube+logo.webp"
                alt="youtube"
                width="20px"
              />
            </a>
          </td>
      </tr>
    </table>
      </div>
    </div>
  `;

  await sendEmail({ to, subject, html });
};
const sendReportConfirmation = async (to: string, userName: string) => {
  const subject = 'Thank You for Your Report!';
  const html = `
    <div
      style="
        width: 100%;
        background: #f4f4f4;
        margin: 0 auto;
        font-family: Inter, sans-serif;
        text-align: center;
        padding: 50px 0px;
      "
    >
      <img
        src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/iterbenelogo.png"
        alt="Logo"
        style="width: 80px; margin-bottom: 20px"
      />
      <table
        style="
          width: 100%;
          background: #ffffff;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid rgb(216, 212, 212);
          box-shadow: 5px #ffffff;
          border-radius: 10px;
          padding: 20px;
        "
      >
        <tr>
          <td>
             <h2 style="color: #139BE7; font-size: 24px; margin-bottom: 10px;">Thank You for Your Report!</h2>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Hello ${userName},</p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">We appreciate you taking the time to submit a report. Your feedback is valuable to us, and we'll review it as soon as possible. Rest assured, we'll take the necessary action and keep you updated.</p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">If you have any more information to share or need assistance, feel free to reach out.</p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Thank you for helping us improve!</p>
            <a href="#" style="display: inline-block; background-color: #F1CF70; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; text-align: center; margin-top: 20px;">Contact Support</a>
            <p style="font-size: 14px; color: #777; text-align: center; margin-top: 20px;">Best regards,<br>The Iter Bene Team</p>
          </td>
        </tr>
      </table>
      <div style="text-align: center; margin-top: 20px">
        <h1 style="font-size: 14px; font-weight: 300">Follow Us:</h1>
           <table style="margin-top: 20px; display: inline-block; text-align: center;">
      <tr>
        <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/facebook.logo.png"
                alt="facebook"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/instagram.logo.png"
                alt="instagram"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/twitter.logo.jpg"
                alt="twitter"
                width="20px"
              />
            </a>
          </td>
          <td
            style="
              padding: 10px;
              border: 1px solid gray;
              border-radius: 5px;
              background: #ffffff;
            "
          >
            <a
              href="http://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://iter-bene.s3.eu-north-1.amazonaws.com/basic/youtube+logo.webp"
                alt="youtube"
                width="20px"
              />
            </a>
          </td>
      </tr>
    </table>
      </div>
    </div>
  `;
  await sendEmail({ to, subject, html });
};

export {
  sendEmail,
  sendLoginVerificationEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendAdminOrSuperAdminCreationEmail,
  sendSupportMessageEmail,
  sendWelcomeEmail,
  sendReportConfirmation,
  sendWarningEmail,
  sendBanNotificationEmail,
};
