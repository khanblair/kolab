export default {
  providers: [
    {
      type: "customJwt",
      applicationID: "authenticated",
      issuer: "https://cekemexqgzriwofnpppe.supabase.co/auth/v1",
      jwks: "https://cekemexqgzriwofnpppe.supabase.co/auth/v1/.well-known/jwks.json",
      algorithm: "ES256",
    },
  ],
};
