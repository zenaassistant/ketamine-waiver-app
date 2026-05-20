'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SigPadProps {
  id: string
  name: string
  onSign: (dataUrl: string) => void
  onClear: () => void
}

const SIG_FONTS = [
  { label: 'Elegant', font: 'Dancing Script', style: 'cursive' },
  { label: 'Classic', font: 'Great Vibes', style: 'cursive' },
  { label: 'Bold', font: 'Pacifico', style: 'cursive' },
  { label: 'Formal', font: 'Pinyon Script', style: 'cursive' },
  { label: 'Simple', font: 'Caveat', style: 'cursive' },
]

function SignaturePad({ id, name, onSign, onClear }: SigPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const [isSigned, setIsSigned] = useState(false)
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [selectedFont, setSelectedFont] = useState(0)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const initialized = useRef(false)

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const w = wrap.getBoundingClientRect().width
    if (w === 0 || initialized.current) return
    initialized.current = true
    canvas.width = Math.floor(w)
    canvas.height = 110
    canvas.style.width = Math.floor(w) + 'px'
    canvas.style.height = '110px'
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1a2744'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    initCanvas()
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => initCanvas())
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [initCanvas])

  const renderTypedSig = useCallback((fontIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas || !name.trim()) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const font = SIG_FONTS[fontIndex]
    const fontSize = Math.min(52, canvas.width / (name.length * 0.6 + 2))
    ctx.font = `${fontSize}px '${font.font}', ${font.style}`
    ctx.fillStyle = '#1a2744'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, 16, canvas.height / 2)
    onSign(canvas.toDataURL('image/png'))
    setIsSigned(true)
  }, [name, onSign])

  useEffect(() => {
    if (mode === 'type' && name.trim()) {
      const t = setTimeout(() => renderTypedSig(selectedFont), 100)
      return () => clearTimeout(t)
    }
  }, [mode, selectedFont, name, renderTypedSig])

  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    isDrawing.current = true
    lastPos.current = getPos(e.nativeEvent as MouseEvent | TouchEvent)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    lastPos.current = pos
    setIsSigned(true)
  }, [])

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    lastPos.current = null
    onSign(canvasRef.current!.toDataURL('image/png'))
  }, [onSign])

  const clear = useCallback(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsSigned(false)
    onClear()
  }, [onClear])

  const switchMode = (newMode: 'draw' | 'type') => {
    clear()
    setMode(newMode)
  }

  return (
    <div className="sig-section">
      <div className="sig-mode-toggle">
        <button
          type="button"
          className={`sig-mode-btn ${mode === 'draw' ? 'active' : ''}`}
          onClick={() => switchMode('draw')}
        >
          ✏️ Draw
        </button>
        <button
          type="button"
          className={`sig-mode-btn ${mode === 'type' ? 'active' : ''}`}
          onClick={() => switchMode('type')}
        >
          Aa Type
        </button>
      </div>

      {mode === 'type' && (
        <div className="sig-font-picker">
          {SIG_FONTS.map((f, i) => (
            <button
              key={f.font}
              type="button"
              className={`sig-font-option ${selectedFont === i ? 'selected' : ''}`}
              style={{ fontFamily: `'${f.font}', cursive` }}
              onClick={() => { setSelectedFont(i); renderTypedSig(i) }}
            >
              {name.trim() || 'Your Name'}
            </button>
          ))}
        </div>
      )}

      <div className="sig-label">
        <span>Signature</span>
        {isSigned && <button type="button" onClick={clear}>Clear</button>}
      </div>

      <div className="sig-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ pointerEvents: mode === 'type' ? 'none' : 'auto' }}
          onMouseDown={mode === 'draw' ? startDraw : undefined}
          onMouseMove={mode === 'draw' ? draw : undefined}
          onMouseUp={mode === 'draw' ? endDraw : undefined}
          onMouseLeave={mode === 'draw' ? endDraw : undefined}
          onTouchStart={mode === 'draw' ? startDraw : undefined}
          onTouchMove={mode === 'draw' ? draw : undefined}
          onTouchEnd={mode === 'draw' ? endDraw : undefined}
        />
        {!isSigned && mode === 'draw' && (
          <div className="sig-placeholder">
            <span>Sign here with your finger or mouse</span>
          </div>
        )}
        {!isSigned && mode === 'type' && (
          <div className="sig-placeholder">
            <span>{name.trim() ? 'Select a style above' : 'Enter your name at the top first'}</span>
          </div>
        )}
      </div>

      <div className="date-row">
        <label>Date</label>
        <span className="date-display">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </div>
  )
}

export default function WaiverPage() {
  const router = useRouter()
  const [patientName, setPatientName] = useState('')
  const [arrivalMethod, setArrivalMethod] = useState('')
  const [arrivalOther, setArrivalOther] = useState('')
  const [arrivalFriend, setArrivalFriend] = useState('')
  const [departureMethod, setDepartureMethod] = useState('')
  const [departureOther, setDepartureOther] = useState('')
  const [departureFriend, setDepartureFriend] = useState('')
  const [sig1, setSig1] = useState('')
  const [sig2, setSig2] = useState('')
  const [sig3, setSig3] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})

  const validate = () => {
    const errors: Record<string, boolean> = {}
    if (!patientName.trim()) errors.patientName = true
    if (!arrivalMethod) errors.arrivalMethod = true
    if (!departureMethod) errors.departureMethod = true
    if (!sig1) errors.sig1 = true
    if (!sig2) errors.sig2 = true
    if (!sig3) errors.sig3 = true
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) {
      setError('Please complete all required fields and sign all three agreements.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const payload = {
        patientName: patientName.trim(), date: today,
        arrivalMethod, arrivalOther, arrivalFriend,
        departureMethod, departureOther, departureFriend,
        sig1, sig2, sig3,
      }
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Submission failed')
      router.push('/success')
    } catch {
      setError('Something went wrong. Please try again or ask staff for assistance.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-wrapper">
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&family=Pinyon+Script&family=Caveat:wght@600&display=swap"
        rel="stylesheet"
      />
      <div className="form-card">
        <div className="form-header">
          <div className="form-header-logo">Conscious Health</div>
          <h1>Treatment Compliance Agreements</h1>
          <p>Please read each agreement carefully and sign where indicated.</p>
        </div>

        <div className="form-body">
          <div className="patient-name-section">
            <label htmlFor="patientName">Patient Full Name</label>
            <input
              id="patientName"
              type="text"
              placeholder="Your full legal name"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className={validationErrors.patientName ? 'field-error' : ''}
              autoComplete="name"
            />
            {validationErrors.patientName && <p className="validation-hint">Name is required</p>}
          </div>

          <div className="agreement-block">
            <div className="agreement-header">
              <div className="agreement-number">1</div>
              <h2>Transportation Agreement</h2>
            </div>
            <div className="agreement-body">
              <p className="agreement-text">
                I, <strong>{patientName || '_______________'}</strong>, agree I am not driving myself home after my service and I have a responsible adult driving me or accompanying me home after my service. I understand I should not drive or operate dangerous machinery for the remainder of the day on which I receive my service.
              </p>
              <div className="transport-grid">
                <div className="transport-col">
                  <label className="section-label">Method of Arrival</label>
                  <label className="radio-option">
                    <input type="radio" name="arrival" value="uber_lyft" onChange={e => { setArrivalMethod(e.target.value); setArrivalOther(''); setArrivalFriend('') }} />
                    <span>Uber / Lyft</span>
                  </label>
                  <label className="radio-option">
                    <input type="radio" name="arrival" value="friend_family" onChange={e => { setArrivalMethod(e.target.value); setArrivalOther('') }} />
                    <span>Friend / Family Member</span>
                  </label>
                  {arrivalMethod === 'friend_family' && (
                    <div className="other-input-wrap">
                      <input type="text" placeholder="Name & relation" value={arrivalFriend} onChange={e => setArrivalFriend(e.target.value)} />
                    </div>
                  )}
                  <label className="radio-option" style={{ marginTop: '0.25rem' }}>
                    <input type="radio" name="arrival" value="other" onChange={e => { setArrivalMethod(e.target.value); setArrivalFriend('') }} />
                    <span>Other</span>
                  </label>
                  {arrivalMethod === 'other' && (
                    <div className="other-input-wrap">
                      <input type="text" placeholder="Please specify" value={arrivalOther} onChange={e => setArrivalOther(e.target.value)} />
                    </div>
                  )}
                  {validationErrors.arrivalMethod && <p className="validation-hint">Please select a method</p>}
                </div>
                <div className="transport-col">
                  <label className="section-label">Method of Departure</label>
                  <label className="radio-option">
                    <input type="radio" name="departure" value="uber_lyft" onChange={e => { setDepartureMethod(e.target.value); setDepartureOther(''); setDepartureFriend('') }} />
                    <span>Uber / Lyft</span>
                  </label>
                  <label className="radio-option">
                    <input type="radio" name="departure" value="friend_family" onChange={e => { setDepartureMethod(e.target.value); setDepartureOther('') }} />
                    <span>Friend / Family Member</span>
                  </label>
                  {departureMethod === 'friend_family' && (
                    <div className="other-input-wrap">
                      <input type="text" placeholder="Name & relation" value={departureFriend} onChange={e => setDepartureFriend(e.target.value)} />
                    </div>
                  )}
                  <label className="radio-option" style={{ marginTop: '0.25rem' }}>
                    <input type="radio" name="departure" value="other" onChange={e => { setDepartureMethod(e.target.value); setDepartureFriend('') }} />
                    <span>Other</span>
                  </label>
                  {departureMethod === 'other' && (
                    <div className="other-input-wrap">
                      <input type="text" placeholder="Please specify" value={departureOther} onChange={e => setDepartureOther(e.target.value)} />
                    </div>
                  )}
                  {validationErrors.departureMethod && <p className="validation-hint">Please select a method</p>}
                </div>
              </div>
              <SignaturePad id="sig1" name={patientName} onSign={setSig1} onClear={() => setSig1('')} />
              {validationErrors.sig1 && <p className="validation-hint">Signature required</p>}
            </div>
          </div>

          <div className="agreement-block">
            <div className="agreement-header">
              <div className="agreement-number">2</div>
              <h2>90-Minute Monitoring Agreement</h2>
            </div>
            <div className="agreement-body">
              <p className="agreement-text">
                I, <strong>{patientName || '_______________'}</strong>, understand I am to be monitored on-site, at Conscious Health, for <strong>at least 90 minutes</strong> after <strong>time of treatment administration</strong> (<span className="highlight">NOT FROM TIME OF ARRIVAL</span>). I agree to not leave the premises of this healthcare setting until the conclusion of the monitoring period.
              </p>
              <SignaturePad id="sig2" name={patientName} onSign={setSig2} onClear={() => setSig2('')} />
              {validationErrors.sig2 && <p className="validation-hint">Signature required</p>}
            </div>
          </div>

          <div className="agreement-block">
            <div className="agreement-header">
              <div className="agreement-number">3</div>
              <h2>Treatment Safety & Precautions</h2>
            </div>
            <div className="agreement-body">
              <p className="agreement-text">
                I, <strong>{patientName || '_______________'}</strong>, acknowledge that prior to treatment, I was informed to <strong>not eat anything within four hours</strong> of the scheduled treatment time and to <strong>not drink any liquids within thirty minutes</strong> of the scheduled treatment time. I was also informed to <strong>not use benzodiazepines nor stimulants <em>(including caffeine)</em> within six hours</strong> of treatment, and to <strong>not use benzodiazepines until at least two hours after</strong> the session.
              </p>
              <p className="agreement-text" style={{ color: '#c0392b', fontWeight: 500 }}>
                Additionally, I attest that I have NOT had any adjunctive ketamine treatments, nor have I consumed recreational ketamine since I began treatment at Conscious Health.
              </p>
              <SignaturePad id="sig3" name={patientName} onSign={setSig3} onClear={() => setSig3('')} />
              {validationErrors.sig3 && <p className="validation-hint">Signature required</p>}
            </div>
          </div>

          <div className="submit-section">
            {error && <div className="error-msg">{error}</div>}
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ marginTop: error ? '1rem' : '0' }}
            >
              {submitting ? 'Submitting…' : 'Submit Agreements'}
            </button>
            <p className="submit-note">
              By submitting, you confirm all information is accurate and your signatures are legally binding.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}