import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';

admin.initializeApp();

type NotificationType = 'success' | 'error' | 'info';

type SendStudyGuideEmailData = {
  guideName: string;
  subjectName?: string;
  topic?: string;
  text: string;
};

function asCleanString(value: unknown): string {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRequiredEnv(name: string): string {
  const value = asCleanString(process.env[name]);
  if (!value) {
    throw new HttpsError('internal', `Falta la variable de entorno ${name}.`);
  }
  return value;
}

function buildStudyGuideHtml(data: {
  guideName: string;
  subjectName: string;
  topic: string;
  text: string;
  displayName: string;
}): string {
  const body = escapeHtml(data.text).replace(/\n/g, '<br>');
  const subjectBlock = data.subjectName
    ? `<p style="margin:0 0 8px 0;color:#4b5563;"><strong>Materia:</strong> ${escapeHtml(data.subjectName)}</p>`
    : '';
  const topicBlock = data.topic
    ? `<p style="margin:0 0 16px 0;color:#4b5563;"><strong>Tema:</strong> ${escapeHtml(data.topic)}</p>`
    : '';

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:800px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#8B0D21;padding:20px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;">Guía de estudio</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 16px 0;color:#111827;">Hola ${escapeHtml(data.displayName)},</p>
          <p style="margin:0 0 20px 0;color:#374151;">Tu guía de estudio se generó correctamente y aquí la tienes.</p>
          <h2 style="margin:0 0 12px 0;color:#111827;font-size:20px;">${escapeHtml(data.guideName)}</h2>
          ${subjectBlock}
          ${topicBlock}
          <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;color:#111827;line-height:1.6;">
            ${body}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function createUserNotification(
  uid: string,
  type: NotificationType,
  title: string,
  message: string,
) {
  return admin.firestore().collection(`users/${uid}/notifications`).add({
    title,
    message,
    type,
    read: false,
    source: 'study-guide-email',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function extractErrorMessage(error: unknown): string {
  const fallback = 'No se pudo enviar el correo.';
  if (!error || typeof error !== 'object') return fallback;

  const e = error as {
    message?: string;
    code?: string;
    response?: string;
    command?: string;
  };

  return e.message?.trim() || e.code?.trim() || e.response?.trim() || e.command?.trim() || fallback;
}

function createMailer() {
  const user = getRequiredEnv('SMTP_USER');
  const pass = getRequiredEnv('SMTP_PASS');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });
}

export const sendStudyGuideEmail = onCall(
  {
    region: 'us-central1',
  },
  async (request: CallableRequest<SendStudyGuideEmailData>) => {
    console.log('sendStudyGuideEmail iniciado');

    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const uid = request.auth.uid;
    const raw = (request.data ?? {}) as Partial<SendStudyGuideEmailData>;

    const guideName = asCleanString(raw.guideName);
    const subjectName = asCleanString(raw.subjectName);
    const topic = asCleanString(raw.topic);
    const text = asCleanString(raw.text);

    console.log('Datos recibidos', {
      uid,
      guideName,
      subjectName,
      topic,
      textLength: text.length,
    });

    if (!guideName) {
      throw new HttpsError('invalid-argument', 'Falta el nombre de la guía.');
    }

    if (!text || text.length < 20) {
      throw new HttpsError('invalid-argument', 'El contenido de la guía es insuficiente.');
    }

    const userRecord = await admin.auth().getUser(uid);
    const to = asCleanString(userRecord.email);
    const displayName = asCleanString(userRecord.displayName) || 'Usuario';

    if (!to) {
      throw new HttpsError('failed-precondition', 'Tu usuario no tiene un correo registrado.');
    }

    const from = getRequiredEnv('MAIL_FROM');
    const transporter = createMailer();

    const subject = `Guía de estudio: ${guideName}`;
    const plainText = [
      `Hola ${displayName},`,
      '',
      'Tu guía de estudio se generó correctamente.',
      '',
      `Guía: ${guideName}`,
      subjectName ? `Materia: ${subjectName}` : '',
      topic ? `Tema: ${topic}` : '',
      '',
      text,
    ]
      .filter(Boolean)
      .join('\n');

    const html = buildStudyGuideHtml({
      guideName,
      subjectName,
      topic,
      text,
      displayName,
    });

    try {
      console.log('Intentando enviar correo', { from, to, subject });

      await transporter.sendMail({
        from,
        to,
        subject,
        text: plainText,
        html,
      });

      console.log('Correo enviado correctamente', { to, guideName });

      const notificationRef = await createUserNotification(
        uid,
        'success',
        'Guía enviada por correo',
        `La guía "${guideName}" se envió a ${to}.`,
      );

      return {
        ok: true,
        email: to,
        notificationId: notificationRef.id,
      };
    } catch (error) {
      const message = extractErrorMessage(error);
      console.error('Falló sendStudyGuideEmail', { uid, to, guideName, message, error });
      throw new HttpsError('internal', message);
    }
  },
);