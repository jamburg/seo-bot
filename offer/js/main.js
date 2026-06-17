document.addEventListener('DOMContentLoaded', () => {

  /* Particles */
  const particlesEl = document.getElementById('particles')
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div')
    p.className = 'particle'
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${2 + Math.random() * 4}px;
      height: ${2 + Math.random() * 4}px;
      animation-delay: ${Math.random() * 20}s;
      animation-duration: ${18 + Math.random() * 25}s;
    `
    particlesEl.appendChild(p)
  }

  /* Header scroll */
  const header = document.getElementById('header')
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60)
  })

  /* Theme toggle */
  const savedTheme = localStorage.getItem('seo-theme') || 'dark'
  document.documentElement.setAttribute('data-theme', savedTheme)

  const themeToggle = document.getElementById('themeToggle')
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme')
    const next = current === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('seo-theme', next)
  })

  /* Mobile nav */
  const mobileToggle = document.getElementById('mobileToggle')
  const navLinks = document.getElementById('navLinks')
  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open')
  })
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'))
  })

  /* Score ring animation */
  const scoreCircle = document.getElementById('scoreCircle')
  const scoreNum = document.getElementById('scoreNum')
  let animated = false

  function animateScore() {
    if (animated) return
    const rect = scoreCircle.getBoundingClientRect()
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0
    if (!isVisible) return
    animated = true

    const circumference = 754
    const targetScore = 87
    const offset = circumference - (targetScore / 100) * circumference

    scoreCircle.style.strokeDashoffset = offset

    let current = 0
    const step = () => {
      current++
      scoreNum.textContent = current
      if (current < targetScore) requestAnimationFrame(step)
    }
    setTimeout(() => requestAnimationFrame(step), 300)
  }

  /* Scroll animations */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        if (entry.target.classList.contains('fade-in-scale') ||
            entry.target.closest('.hero-visual')) {
          animateScore()
        }
      }
    })
  }, { threshold: 0.15 })

  document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale').forEach(el => {
    observer.observe(el)
  })

  /* Smooth scroll for anchors */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'))
      if (target) {
        e.preventDefault()
        const offset = 80
        window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' })
      }
    })
  })

  /* Form validation and submit */
  const form = document.getElementById('leadForm')
  const successDiv = document.getElementById('formSuccess')
  const errorDiv = document.getElementById('formError')
  const submitBtn = document.getElementById('submitBtn')
  const submitText = document.getElementById('submitText')
  const submitSpinner = document.getElementById('submitSpinner')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorDiv.classList.remove('show')

    let hasError = false
    form.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'))

    const name = form.querySelector('#name')
    const phone = form.querySelector('#phone')
    const site = form.querySelector('#site')

    if (!name.value.trim()) { name.closest('.form-group').classList.add('error'); hasError = true }
    if (!phone.value.trim()) { phone.closest('.form-group').classList.add('error'); hasError = true }
    if (!site.value.trim()) { site.closest('.form-group').classList.add('error'); hasError = true }
    else {
      try { new URL(site.value) }
      catch { site.closest('.form-group').classList.add('error'); hasError = true }
    }

    if (hasError) return

    submitText.style.display = 'none'
    submitSpinner.style.display = 'inline-block'
    submitBtn.disabled = true

    try {
      const fd = new FormData(form)
      const res = await fetch(form.action, { method: 'POST', body: fd })
      const data = await res.json()

      if (data.ok) {
        form.style.display = 'none'
        successDiv.classList.add('show')
        window.afterOrderSuccess && window.afterOrderSuccess()
      } else {
        errorDiv.textContent = data.error || 'Произошла ошибка. Попробуйте позже.'
        errorDiv.classList.add('show')
      }
    } catch {
      errorDiv.textContent = 'Не удалось отправить. Проверьте соединение.'
      errorDiv.classList.add('show')
    }

    submitText.style.display = 'inline'
    submitSpinner.style.display = 'none'
    submitBtn.disabled = false
  })

  /* Clear error on input */
  form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => el.closest('.form-group')?.classList.remove('error'))
  })

  /* ====== Counters ====== */
  const counterUrl = 'php/counter.php'
  const footer = document.querySelector('.footer')

  fetch(counterUrl)
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        const p = document.createElement('p')
        p.style.cssText = 'font-size:0.85rem; color:var(--text-secondary); margin-top:8px;'
        p.textContent = `👁 ${data.visits} | 📋 ${data.orders}`
        footer?.querySelector('.container')?.appendChild(p)
      }
    })
    .catch(() => {})

  document.addEventListener('orderSuccess', () => {
    fetch(counterUrl, { method: 'POST' }).catch(() => {})
  })

  const origOnSuccess = window.afterOrderSuccess
  window.afterOrderSuccess = () => {
    document.dispatchEvent(new Event('orderSuccess'))
    if (origOnSuccess) origOnSuccess()
  }
})
