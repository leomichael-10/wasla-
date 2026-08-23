const BASE = 'http://localhost:3000'
const TEST_EMAIL = 'tmp-changepw@example.invalid'

async function login(password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password }),
  })
  const data = await res.json()
  return { status: res.status, token: data.token, data }
}

async function changePassword(token, currentPassword, newPassword) {
  const res = await fetch(`${BASE}/api/profile/change-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function main() {
  console.log('--- login with original password ---')
  const before = await login('OldPassword123')
  console.log('status:', before.status, '| got token:', !!before.token)
  const oldToken = before.token

  console.log('\n--- no auth at all ---')
  const noAuthRes = await fetch(`${BASE}/api/profile/change-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword: 'x', newPassword: 'yyyyyy' }),
  })
  console.log('status (expect 401):', noAuthRes.status, (await noAuthRes.json()).code)

  console.log('\n--- wrong current password ---')
  let r = await changePassword(oldToken, 'TotallyWrongPassword', 'NewPassword456')
  console.log('status:', r.status, '| code:', r.data.code, '| error:', r.data.error)

  console.log('\n--- new password too short ---')
  r = await changePassword(oldToken, 'OldPassword123', '123')
  console.log('status:', r.status, '| code:', r.data.code, '| error:', r.data.error)

  console.log('\n--- missing fields ---')
  r = await changePassword(oldToken, '', '')
  console.log('status:', r.status, '| code:', r.data.code)

  console.log('\n--- valid change ---')
  r = await changePassword(oldToken, 'OldPassword123', 'NewPassword456')
  console.log('status:', r.status, '| got fresh token:', !!r.data.token, '| user:', r.data.user)
  const freshToken = r.data.token

  console.log('\n--- old password no longer works for login ---')
  const oldLoginAttempt = await login('OldPassword123')
  console.log('status (expect 401):', oldLoginAttempt.status)

  console.log('\n--- new password works for login ---')
  const newLoginAttempt = await login('NewPassword456')
  console.log('status (expect 200):', newLoginAttempt.status, '| got token:', !!newLoginAttempt.token)

  console.log('\n--- OLD pre-change token now rejected on a real protected route ---')
  const oldTokenCheck = await fetch(`${BASE}/api/profile`, { headers: { Authorization: `Bearer ${oldToken}` } })
  console.log('status (expect 401):', oldTokenCheck.status)

  console.log('\n--- FRESH token (from change-password response) still works ---')
  const freshTokenCheck = await fetch(`${BASE}/api/profile`, { headers: { Authorization: `Bearer ${freshToken}` } })
  console.log('status (expect 200):', freshTokenCheck.status)

  console.log('\n--- reusing wrong current password again (repeat, sanity) ---')
  r = await changePassword(freshToken, 'WrongAgain', 'AnotherPassword789')
  console.log('status:', r.status, '| code:', r.data.code)
}

main().catch(err => { console.error('FAILED:', err); process.exitCode = 1 })
