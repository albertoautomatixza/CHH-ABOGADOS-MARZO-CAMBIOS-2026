    function initNavigation(){
      const menuToggle = document.getElementById('mobile-menu');
      const navMenu = document.querySelector('.nav-menu');
      if(!menuToggle || !navMenu){
        return null;
      }

      function setState(isOpen){
        const isMobile = window.innerWidth < 768;
        navMenu.classList.toggle('active', isOpen);
        menuToggle.classList.toggle('active', isOpen);
        document.body.classList.toggle('nav-open', isOpen && isMobile);
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        navMenu.setAttribute('aria-hidden', isMobile && !isOpen ? 'true' : 'false');
      }

      setState(false);

      function toggle(){
        setState(!navMenu.classList.contains('active'));
      }

      menuToggle.addEventListener('click', toggle);
      menuToggle.addEventListener('keydown', function(event){
        if(event.key === 'Enter' || event.key === ' '){
          event.preventDefault();
          toggle();
        }
      });

      navMenu.querySelectorAll('a').forEach(function(link){
        link.addEventListener('click', function(){
          setState(false);
        });
      });

      function sync(){
        const isMobile = window.innerWidth < 768;
        const isOpen = navMenu.classList.contains('active');
        setState(isMobile && isOpen);
        if(!isMobile){
          navMenu.classList.remove('active');
          menuToggle.classList.remove('active');
        }
      }

      return {
        close:function(){
          setState(false);
        },
        sync
      };
    }

    let navigationApi = null;
    let metricsCarouselApi = null;

    function initMetricsCarousel(){
      const carousel = document.querySelector('.metrics-carousel');
      if(!carousel){
        return;
      }
      const track = carousel.querySelector('.metrics-track');
      const prevBtn = carousel.querySelector('.metrics-control--prev');
      const nextBtn = carousel.querySelector('.metrics-control--next');
      if(!track || !prevBtn || !nextBtn){
        return;
      }
      const originalSlides = Array.from(track.querySelectorAll('.metric-card'));
      if(originalSlides.length <= 1){
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
      }
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const TRANSITION_VALUE = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
      const totalSlides = originalSlides.length;
      let cardWidth = 0;
      let gap = 0;
      let stepSize = 0;
      let cardsPerView = 1;
      let currentIndex = 0;
      let isTransitioning = false;
      let isManuallyPaused = false;
      let autoPlayId = null;

      function computeMeasurements(){
        const style = window.getComputedStyle(track);
        const gapValue = parseFloat(style.columnGap || style.gap || '0');
        gap = Number.isNaN(gapValue) ? 0 : gapValue;
        const referenceSlide = track.querySelector('.metric-card:not(.metric-card-clone)');
        cardWidth = referenceSlide ? referenceSlide.getBoundingClientRect().width : 0;
        stepSize = cardWidth > 0 ? cardWidth + gap : 0;
      }

      function getCardsPerView(){
        const computed = window.getComputedStyle(carousel).getPropertyValue('--cards-per-view');
        const parsed = parseFloat(computed);
        if(Number.isNaN(parsed) || parsed <= 0){
          return 1;
        }
        return Math.min(totalSlides, Math.round(parsed));
      }

      function jumpToIndex(index, immediate){
        if(stepSize <= 0){
          computeMeasurements();
        }
        if(stepSize <= 0){
          return;
        }
        const translateValue = -index * stepSize;
        if(immediate){
          track.style.transition = 'none';
          track.style.transform = `translateX(${translateValue}px)`;
          void track.offsetWidth;
          track.style.transition = TRANSITION_VALUE;
        } else {
          track.style.transition = TRANSITION_VALUE;
          track.style.transform = `translateX(${translateValue}px)`;
        }
      }

      function stopAuto(){
        if(autoPlayId){
          clearInterval(autoPlayId);
          autoPlayId = null;
        }
      }

      function startAuto(){
        if(isManuallyPaused || prefersReducedMotion.matches || autoPlayId){
          return;
        }
        if(stepSize <= 0){
          computeMeasurements();
        }
        if(stepSize <= 0 || totalSlides <= cardsPerView){
          return;
        }
        autoPlayId = window.setInterval(function(){
          if(!isTransitioning){
            goToNext();
          }
        }, 5200);
      }

      function rebuildCarousel(){
        const wasPaused = isManuallyPaused;
        stopAuto();
        cardsPerView = getCardsPerView();
        const disableControls = totalSlides <= cardsPerView;
        prevBtn.disabled = disableControls;
        nextBtn.disabled = disableControls;
        track.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const clonesToRender = Math.min(cardsPerView, totalSlides);

        for(let i = clonesToRender; i > 0; i--){
          const sourceIndex = (totalSlides - i) % totalSlides;
          const clone = originalSlides[sourceIndex].cloneNode(true);
          clone.classList.add('metric-card-clone');
          clone.setAttribute('aria-hidden', 'true');
          clone.removeAttribute('role');
          clone.removeAttribute('data-animate');
          clone.setAttribute('tabindex', '-1');
          fragment.appendChild(clone);
        }

        originalSlides.forEach(function(slide){
          slide.classList.remove('metric-card-clone');
          slide.removeAttribute('aria-hidden');
          slide.removeAttribute('tabindex');
          fragment.appendChild(slide);
        });

        for(let i = 0; i < clonesToRender; i++){
          const clone = originalSlides[i % totalSlides].cloneNode(true);
          clone.classList.add('metric-card-clone');
          clone.setAttribute('aria-hidden', 'true');
          clone.removeAttribute('role');
          clone.removeAttribute('data-animate');
          clone.setAttribute('tabindex', '-1');
          fragment.appendChild(clone);
        }

        track.appendChild(fragment);
        computeMeasurements();
        isTransitioning = false;
        currentIndex = cardsPerView;
        jumpToIndex(currentIndex, true);
        if(!wasPaused && !prefersReducedMotion.matches){
          startAuto();
        }
      }

      function goToNext(){
        if(isTransitioning){
          return;
        }
        if(stepSize <= 0){
          computeMeasurements();
        }
        if(stepSize <= 0){
          return;
        }
        isTransitioning = true;
        currentIndex += 1;
        jumpToIndex(currentIndex, false);
      }

      function goToPrev(){
        if(isTransitioning){
          return;
        }
        if(stepSize <= 0){
          computeMeasurements();
        }
        if(stepSize <= 0){
          return;
        }
        isTransitioning = true;
        currentIndex -= 1;
        jumpToIndex(currentIndex, false);
      }

      function handleTransitionEnd(event){
        if(event.target !== track || event.propertyName !== 'transform'){
          return;
        }
        const maxIndex = totalSlides + cardsPerView;
        if(currentIndex >= maxIndex){
          currentIndex = cardsPerView;
          jumpToIndex(currentIndex, true);
        } else if(currentIndex < cardsPerView){
          currentIndex = totalSlides + currentIndex;
          jumpToIndex(currentIndex, true);
        }
        isTransitioning = false;
      }

      track.addEventListener('transitionend', handleTransitionEnd);

      prevBtn.addEventListener('click', function(){
        if(isTransitioning){
          return;
        }
        isManuallyPaused = true;
        stopAuto();
        goToPrev();
      });

      nextBtn.addEventListener('click', function(){
        if(isTransitioning){
          return;
        }
        isManuallyPaused = true;
        stopAuto();
        goToNext();
      });

      if(typeof ResizeObserver === 'function'){
        const resizeObserver = new ResizeObserver(function(){
          rebuildCarousel();
        });
        resizeObserver.observe(carousel);
      }

      if(typeof prefersReducedMotion.addEventListener === 'function'){
        prefersReducedMotion.addEventListener('change', function(event){
          if(event.matches){
            stopAuto();
          } else if(!isManuallyPaused){
            startAuto();
          }
        });
      } else if(typeof prefersReducedMotion.addListener === 'function'){
        prefersReducedMotion.addListener(function(event){
          if(event.matches){
            stopAuto();
          } else if(!isManuallyPaused){
            startAuto();
          }
        });
      }

      rebuildCarousel();

      metricsCarouselApi = {
        recompute: rebuildCarousel
      };
    }

    function initImpactNumbers(){
      const numberEls = document.querySelectorAll('.impact-number');
      if(!numberEls.length){
        return;
      }
      const digitSequence = ['0','1','2','3','4','5','6','7','8','9','0'];
      let globalDigitIndex = 0;
      numberEls.forEach(function(numberEl){
        const baseValue = numberEl.dataset.number || numberEl.textContent.trim();
        const suffix = numberEl.dataset.suffix || '';
        const prefix = numberEl.dataset.prefix || '';
        const accessibleValue = "" + prefix + baseValue + suffix;
        numberEl.setAttribute('aria-label', accessibleValue);
        numberEl.setAttribute('role', 'text');
        const digitsWrapper = document.createElement('span');
        digitsWrapper.className = 'impact-number-digits';
        digitsWrapper.setAttribute('aria-hidden', 'true');
        const characters = baseValue.split('');
        characters.forEach(function(char){
          if(/\d/.test(char)){
            const digitValue = parseInt(char, 10);
            const column = document.createElement('span');
            column.className = 'digit-column';
            column.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.className = 'digit-column-inner';
            const startIndex = digitValue === 0 ? 9 : 0;
            const endIndex = digitValue === 0 ? 10 : digitValue;
            const startOffset = -startIndex * 100;
            inner.dataset.startIndex = String(startIndex);
            inner.dataset.endIndex = String(endIndex);
            const columnDelay = globalDigitIndex * 0.08;
            inner.dataset.delay = columnDelay.toFixed(2);
            inner.style.transitionDelay = `${columnDelay}s`;
            inner.style.transform = `translate3d(0, ${startOffset}%, 0)`;
            digitSequence.forEach(function(digit){
              const digitSpan = document.createElement('span');
              digitSpan.textContent = digit;
              inner.appendChild(digitSpan);
            });
            column.appendChild(inner);
            digitsWrapper.appendChild(column);
            globalDigitIndex++;
          } else {
            const staticSpan = document.createElement('span');
            staticSpan.className = 'impact-number-static';
            staticSpan.textContent = char;
            staticSpan.setAttribute('aria-hidden', 'true');
            digitsWrapper.appendChild(staticSpan);
          }
        });
        numberEl.textContent = '';
        if(prefix){
          const prefixSpan = document.createElement('span');
          prefixSpan.className = 'impact-number-static impact-number-prefix';
          prefixSpan.textContent = prefix;
          prefixSpan.setAttribute('aria-hidden', 'true');
          numberEl.appendChild(prefixSpan);
        }
        numberEl.appendChild(digitsWrapper);
        if(suffix){
          const suffixSpan = document.createElement('span');
          suffixSpan.className = 'impact-number-static impact-number-suffix';
          suffixSpan.textContent = suffix;
          suffixSpan.setAttribute('aria-hidden', 'true');
          numberEl.appendChild(suffixSpan);
        }
      });

      const impactSection = document.querySelector('.impact');
      if(!impactSection){
        return;
      }
      const observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('impact-numbers-active');
            const columnInners = entry.target.querySelectorAll('.digit-column-inner');
            columnInners.forEach(function(inner){
              if(inner.dataset.animated === 'true'){
                return;
              }
              const endIndex = Number(inner.dataset.endIndex || 0);
              if(Number.isNaN(endIndex)){
                return;
              }
              const delay = inner.dataset.delay || '0';
              inner.style.transitionDelay = `${delay}s`;
              const finalOffset = -endIndex * 100;
              // force reflow to ensure transition plays from the start value
              void inner.offsetHeight;
              requestAnimationFrame(function(){
                inner.style.transform = `translate3d(0, ${finalOffset}%, 0)`;
              });
              inner.addEventListener('transitionend', function handleTransitionEnd(event){
                if(event.propertyName === 'transform'){
                  inner.style.transitionDelay = '0s';
                  inner.style.transform = `translate3d(0, ${finalOffset}%, 0)`;
                  inner.dataset.animated = 'true';
                  inner.removeEventListener('transitionend', handleTransitionEnd);
                }
              });
            });
            observer.unobserve(entry.target);
          }
        });
      }, {threshold:0.35});
      observer.observe(impactSection);
    }

    function initHeroGrid(){
      const hero = document.querySelector('.hero');
      if(!hero){
        return;
      }
      const grid = hero.querySelector('.hero-grid');
      if(!grid){
        return;
      }
      const columns = 40;
      const rows = 40;
      const fragment = document.createDocumentFragment();
      const cells = [];
      for(let row = 0; row < rows; row++){
        for(let col = 0; col < columns; col++){
          const cell = document.createElement('span');
          cell.className = 'hero-grid-cell';
          fragment.appendChild(cell);
          cells.push(cell);
        }
      }
      grid.appendChild(fragment);

      const activeTimeouts = new Map();
      let lastPoint = null;

      function scheduleClear(cell){
        const existing = activeTimeouts.get(cell);
        if(existing){
          clearTimeout(existing);
        }
        const timeout = setTimeout(function(){
          cell.classList.remove('is-active');
          activeTimeouts.delete(cell);
        }, 1200);
        activeTimeouts.set(cell, timeout);
      }

      function activateCell(row, col){
        if(row < 0 || row >= rows || col < 0 || col >= columns){
          return;
        }
        const index = row * columns + col;
        const cell = cells[index];
        if(!cell){
          return;
        }
        cell.classList.add('is-active');
        scheduleClear(cell);
      }

      function drawLine(fromRow, fromCol, toRow, toCol){
        const deltaRow = toRow - fromRow;
        const deltaCol = toCol - fromCol;
        const steps = Math.max(Math.abs(deltaRow), Math.abs(deltaCol));
        if(steps === 0){
          activateCell(fromRow, fromCol);
          return;
        }
        for(let step = 0; step <= steps; step++){
          const row = Math.round(fromRow + (deltaRow * step) / steps);
          const col = Math.round(fromCol + (deltaCol * step) / steps);
          activateCell(row, col);
        }
      }

      function handlePointer(event){
        const rect = hero.getBoundingClientRect();
        const relativeX = event.clientX - rect.left;
        const relativeY = event.clientY - rect.top;
        const col = Math.floor((relativeX / rect.width) * columns);
        const row = Math.floor((relativeY / rect.height) * rows);
        if(row < 0 || row >= rows || col < 0 || col >= columns){
          return;
        }
        if(lastPoint && lastPoint.row === row && lastPoint.col === col){
          return;
        }
        if(lastPoint){
          drawLine(lastPoint.row, lastPoint.col, row, col);
        } else {
          activateCell(row, col);
        }
        lastPoint = {row, col};
      }

      hero.addEventListener('pointermove', handlePointer);
      hero.addEventListener('pointerdown', handlePointer);
      hero.addEventListener('pointerenter', handlePointer);
      hero.addEventListener('pointerleave', function(){
        lastPoint = null;
      });
    }

    function initScrollAnimations(){
      const allAnimatedElements = Array.from(document.querySelectorAll('[data-animate]'));
      if(allAnimatedElements.length === 0){
        return;
      }
      const groupedContainers = Array.from(document.querySelectorAll('[data-animate-group]'));
      const groupedElements = new Set();
      groupedContainers.forEach(function(container){
        container.querySelectorAll('[data-animate]').forEach(function(element){
          groupedElements.add(element);
        });
      });
      const animatedElements = allAnimatedElements.filter(function(element){
        return !groupedElements.has(element);
      });
      const observerOptions = {threshold:0.06, rootMargin:'0px 0px -8% 0px'};

      if(!('IntersectionObserver' in window)){
        allAnimatedElements.forEach(function(element){
          element.classList.add('is-visible');
        });
        return;
      }

      function createGroupedObserver(containers, options){
        if(!containers.length){
          return;
        }
        const groupedObserver = new IntersectionObserver(function(entries, obs){
          entries.forEach(function(entry){
            if(entry.isIntersecting){
              entry.target.classList.add('is-visible');
              entry.target.querySelectorAll('[data-animate]').forEach(function(element){
                element.classList.add('is-visible');
              });
              obs.unobserve(entry.target);
            }
          });
        }, options);
        containers.forEach(function(container){
          groupedObserver.observe(container);
        });
      }

      if(groupedContainers.length){
        createGroupedObserver(groupedContainers, observerOptions);
      }

      if(animatedElements.length === 0){
        return;
      }

      const observer = new IntersectionObserver(function(entries, obs){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, observerOptions);

      animatedElements.forEach(function(element){
        observer.observe(element);
      });
    }

    function initDeferredBackgroundMedia(){
      const mediaCards = document.querySelectorAll('[data-bg-src]');
      if(!mediaCards.length){
        return;
      }

      mediaCards.forEach(function(card){
        const source = card.getAttribute('data-bg-src');
        if(!source){
          return;
        }

        card.style.setProperty('--card-bg-image', `url("${source}")`);
        card.dataset.bgLoaded = 'true';
      });
    }

    const form = document.getElementById('contactForm');
    const feedbackEl = document.getElementById('formFeedback');
    if(form && feedbackEl){
      form.addEventListener('submit', function(event){
        event.preventDefault();
        if(!form.checkValidity()){
          feedbackEl.textContent = 'Por favor complete los campos obligatorios.';
          feedbackEl.style.color = '#dc173e';
          form.reportValidity();
          return;
        }
        feedbackEl.textContent = '¡Gracias! Hemos recibido su mensaje y nos comunicaremos pronto.';
        feedbackEl.style.color = '#ffffff';
        form.reset();
      });
    }

    window.addEventListener('DOMContentLoaded', function(){
      navigationApi = initNavigation();
      initHeroGrid();
      initMetricsCarousel();
      initImpactNumbers();
      initScrollAnimations();
      initDeferredBackgroundMedia();
    });

    let resizeTicking = false;
    window.addEventListener('resize', function(){
      if(resizeTicking){
        return;
      }
      resizeTicking = true;
      window.requestAnimationFrame(function(){
        if(navigationApi && typeof navigationApi.sync === 'function'){
          navigationApi.sync();
        }
        if(metricsCarouselApi && typeof metricsCarouselApi.recompute === 'function'){
          metricsCarouselApi.recompute();
        }
        resizeTicking = false;
      });
    });
