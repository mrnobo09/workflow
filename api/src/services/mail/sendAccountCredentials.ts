import nodemailer from "nodemailer";
import { config } from "../../config.js";

type AccountCredentials = {
    to: string;
    name: string;
    companyName: string;
    password: string;
};

export async function sendAccountCredentials(input: AccountCredentials) {
    const text = [
        `Hello ${input.name},`,
        "",
        `An account was created for you at ${input.companyName}.`,
        `Email: ${input.to}`,
        `Password: ${input.password}`,
    ].join("\n");

    if (!config.smtp.host) {
        console.log(`[mail] SMTP_HOST is not set. Would send to ${input.to}:\n${text}`);
        return;
    }

    const transport = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        auth: config.smtp.user
            ? { user: config.smtp.user, pass: config.smtp.pass ?? "" }
            : undefined,
    });

    await transport.sendMail({
        from: config.smtp.from,
        to: input.to,
        subject: `Your ${input.companyName} account`,
        text,
    });
}
