"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStudyGuideEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const sgMail = __importStar(require("@sendgrid/mail"));
admin.initializeApp();
const SENDGRID_API_KEY = (0, params_1.defineSecret)('SENDGRID_API_KEY');
const SENDGRID_FROM_EMAIL = (0, params_1.defineSecret)('SENDGRID_FROM_EMAIL');
function asCleanString(value) {
    return String(value ?? '').replace(/\r\n/g, '\n').trim();
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function buildStudyGuideHtml(data) {
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
          <p style="margin:0 0 20px 0;color:#374151;">Tu guía se generó correctamente y aquí la tienes.</p>
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
async function createUserNotification(uid, type, title, message) {
    return admin.firestore().collection(`users/${uid}/notifications`).add({
        title,
        message,
        type,
        read: false,
        source: 'study-guide-email',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
function extractErrorMessage(error) {
    const fallback = 'No se pudo enviar el correo.';
    if (!error || typeof error !== 'object')
        return fallback;
    const e = error;
    return (e.response?.body?.errors?.[0]?.message?.trim() ||
        e.message?.trim() ||
        fallback);
}
exports.sendStudyGuideEmail = (0, https_1.onCall)({
    region: 'us-central1',
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL],
}, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    const uid = request.auth.uid;
    const raw = (request.data ?? {});
    const guideName = asCleanString(raw.guideName);
    const subjectName = asCleanString(raw.subjectName);
    const topic = asCleanString(raw.topic);
    const text = asCleanString(raw.text);
    if (!guideName) {
        throw new https_1.HttpsError('invalid-argument', 'Falta el nombre de la guía.');
    }
    if (!text || text.length < 20) {
        throw new https_1.HttpsError('invalid-argument', 'El contenido de la guía es insuficiente.');
    }
    const user = await admin.auth().getUser(uid);
    const to = asCleanString(user.email);
    const displayName = asCleanString(user.displayName) || 'Usuario';
    if (!to) {
        await createUserNotification(uid, 'error', 'No se pudo enviar la guía', 'Tu usuario no tiene un correo registrado.');
        throw new https_1.HttpsError('failed-precondition', 'Tu usuario no tiene un correo registrado.');
    }
    sgMail.setApiKey(SENDGRID_API_KEY.value());
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
        await sgMail.send({
            to,
            from: SENDGRID_FROM_EMAIL.value(),
            subject,
            text: plainText,
            html,
        });
        const notificationRef = await createUserNotification(uid, 'success', 'Guía enviada por correo', `La guía "${guideName}" se envió a ${to}.`);
        return {
            ok: true,
            email: to,
            notificationId: notificationRef.id,
        };
    }
    catch (error) {
        const message = extractErrorMessage(error);
        await createUserNotification(uid, 'error', 'No se pudo enviar la guía', `La guía "${guideName}" se guardó, pero el correo falló.`);
        throw new https_1.HttpsError('internal', message);
    }
});
//# sourceMappingURL=index.js.map