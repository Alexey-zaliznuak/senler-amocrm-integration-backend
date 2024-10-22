"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt = require("jsonwebtoken");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ override: true });
const publicKey = process.env.PUBLIC_KEY;
const privateKey = process.env.PRIVATE_KEY;
console.log("Private Key:\n" + privateKey);
console.log("Public Key:\n" + publicKey);
const payload = {
    sub: "1234567890",
    name: "John Doe",
    admin: true
};
const signOptions = {
    algorithm: 'RS256',
    expiresIn: '7d'
};
const token = jwt.sign(payload, privateKey, signOptions);
console.log("Generated JWT:", token);
try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    console.log("Decoded JWT:", decoded);
}
catch (err) {
    console.error("Token verification failed:", err);
}
//# sourceMappingURL=main.js.map