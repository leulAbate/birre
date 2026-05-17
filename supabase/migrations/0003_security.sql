-- Prevent the browser (anon/authenticated role) from ever reading access tokens.
-- Even with a valid user JWT, the client cannot SELECT this column.
-- All Plaid API calls use the service_role key on the server.
REVOKE SELECT (plaid_access_token) ON institutions FROM authenticated;
REVOKE SELECT (plaid_access_token) ON institutions FROM anon;
