import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// Генерация RSA пары ключей
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,  // Размер ключа в битах
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log("Private Key:\n", privateKey[0]);
console.log("Public Key:\n", publicKey[0]);

// Данные для токена
const payload = {
  sub: "1234567890",
  name: "John Doe",
  admin: true
};

// Опции для токена
const signOptions = {
  algorithm: 'RS256',   // RSA с SHA-256
  expiresIn: '7d'       // Время жизни токена
};

// Генерация JWT с использованием сгенерированного приватного ключа
const token = jwt.sign(payload, privateKey, signOptions);

console.log("Generated JWT:", token);

// Проверка JWT с использованием сгенерированного публичного ключа
try {
  const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  console.log("Decoded JWT:", decoded);
} catch (err) {
  console.error("Token verification failed:", err);
}
