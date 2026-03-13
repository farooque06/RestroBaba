import speakeasy from 'speakeasy';

const secret = speakeasy.generateSecret({ 
    name: 'RestroFlow (admin@test.com)',
    issuer: 'RestroFlow'
});

console.log('Secret:', secret);
console.log('OTP Auth URL:', secret.otpauth_url);

const secret2 = speakeasy.generateSecret({ 
    name: 'RestroFlow (admin@test.com)',
    issuer: 'RestroFlow',
    otpauth_url: true
});

console.log('Secret 2 OTP Auth URL:', secret2.otpauth_url);
