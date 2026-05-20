'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SigPadProps {
  id: string
  onSign: (dataUrl: string) => void
  onClear: () => void
}

function SignaturePad({ id, onSign, onClear }: SigPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const [isSigned, setIsSigned] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = 100 * window.devicePixelRatio
    const ctx = canvas.getContext('2d')!
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.strokeStyle = '#1a2744'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current!
    isDrawing.current = true
    lastPos.current = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
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
    const canvas = canvasRef.current!
    onSign(canvas.toDataURL('image/png'))
  }, [onSign])

  const clear = useCallback(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsSigned(false)
    onClear()
  }, [onClear])

  return (
    <div className="sig-section">
      <div className="sig-label">
        <span>Signature</span>
        {isSigned && <button type="button" onClick={clear}>Clear</button>}
      </div>
      <div className="sig-canvas-wrap">
        <canvas
          ref={canvasRef}
          style={{ height: '100px' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!isSigned && (
          <div className="sig-placeholder">
            <span>Sign here with your finger or mouse</span>
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
        patientName: patientName.trim(),
        date: today,
        arrivalMethod,
        arrivalOther,
        arrivalFriend,
        departureMethod,
        departureOther,
        departureFriend,
        sig1,
        sig2,
        sig3,
      }
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Submission failed')
      router.push('/success')
    } catch (err) {
      setError('Something went wrong. Please try again or ask staff for assistance.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="form-card">
        <div className="form-header">
          <div className="form-header-logo">Conscious Health</div>
          <h1>Treatment Compliance Agreements</h1>
          <p>Please read each agreement carefully and sign where indicated.</p>
        </div>

        <div className="form-body">
          {/* Patient Name */}
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

          {/* Agreement 1: Transportation */}
          <div className="agreement-block">
            <div className="agreement-header">
              <div className="agreement-number">1</div>
              <h2>Transportation Agreement</h2>
            </div>
            <div className="agreement-body">
              <p className="agreement-text">
                I, <strong>{patientName || '_______________'}</strong>, agree I am not driving myself home after my service and
                I have a responsible adult driving me or accompanying me home after my service. I understand I should not
                drive or operate dangerous machinery for the remainder of the day on which I receive my service.
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

              <SignaturePad
                id="sig1"
                onSign={setSig1}
                onClear={() => setSig1('')}
              />
              {validationErrors.sig1 && <p className="validation-hint">Signature required</p>}
            </div>
          </div>

          {/* Agreement 2: 90-Minute Monitoring */}
          <div className="agreement-block">
            <div className="agreement-header">
              <div className="agreement-number">2</div>
              <h2>90-Minute Monitoring Agreement</h2>
            </div>
            <div className="agreement-body">
              <p className="agreement-text">
                I, <strong>{patientName || '_______________'}</strong>, understand I am to be monitored on-site, at Conscious Health,
                for <strong>at least 90 minutes</strong> after <strong>time of treatment administration</strong> (<span className="highlight">NOT FROM TIME OF ARRIVAL</span>). I agree
                to not leave the premises of this healthcare setting until the conclusion of the monitoring period,
                after the treatment session.
              </p>
              <SignaturePad
                id="sig2"
                onSign={setSig2}
                onClear={() => setSig2('')}
              />
              {validationErrors.sig2 && <p className="validation-hint">Signature required</p>}
            </div>
          </div>

          {/* Agreement 3: Treatment Safety */}
          <div className="agreement-block">
            <div className="agreement-header">
              <div className="agreement-number">3</div>
              <h2>Treatment Safety & Precautions</h2>
            </div>
            <div className="agreement-body">
              <p className="agreement-text">
                I, <strong>{patientName || '_______________'}</strong>, acknowledge that prior to treatment, I was informed to{' '}
                <strong>not eat anything within four hours</strong> of the scheduled treatment time and to{' '}
                <strong>not drink any liquids within thirty minutes</strong> of the scheduled treatment time.
                I was also informed to <strong>not use benzodiazepines nor stimulants <em>(including caffeine)</em> within six hours</strong> of
                treatment, and to <strong>not use benzodiazepines until at least two hours after</strong> the session.
              </p>
              <p className="agreement-text" style={{ color: '#c0392b', fontWeight: 500 }}>
                Additionally, I attest that I have NOT had any adjunctive ketamine treatments, nor have I consumed
                recreational ketamine since I began treatment at Conscious Health.
              </p>
              <SignaturePad
                id="sig3"
                onSign={setSig3}
                onClear={() => setSig3('')}
              />
              {validationErrors.sig3 && <p className="validation-hint">Signature required</p>}
            </div>
          </div>

          {/* Submit */}
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
