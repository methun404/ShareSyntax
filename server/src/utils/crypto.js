const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET = process.env.ROOM_HISTORY_SECRET || 'ShareSyntaxDefaultSecretKey12345'; // 32 chars

const getKey = () => {
    // Ensure exactly 32 bytes
    return Buffer.from(SECRET.padEnd(32, '0').slice(0, 32), 'utf8');
};

const encrypt = (text) => {
    if (!text) return '';
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
        const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (err) {
        console.error('[CRYPTO] Encrypt error:', err.message);
        return '';
    }
};

const decrypt = (encryptedText) => {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText || '';
    try {
        const [ivHex, encryptedHex] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (err) {
        console.error('[CRYPTO] Decrypt error:', err.message);
        return '';
    }
};

module.exports = { encrypt, decrypt };
