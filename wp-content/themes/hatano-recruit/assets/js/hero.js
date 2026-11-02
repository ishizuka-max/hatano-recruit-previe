/**
 * hero.js — ヒーロー写真スライド／停止ボタン／スマホ固定CTAの表示制御／応募ボタン
 *
 * - main.js（window.HR）が無くても DOMContentLoaded で自己初期化する
 * - スライド：6.5秒ごと。1枚目の画像ロード後に開始。prefers-reduced-motion では動かさない。
 *   停止ボタン（aria-pressed）で停止／再開。タブ非表示中は進めない
 * - 固定CTA：ヒーローが画面外に出たら表示。#contact が見えている間／メニュー開時は非表示
 * - [data-apply-type] のボタン（ヘッダー・モバイルメニュー・ヒーロー・固定CTA）は
 *   HR.apply(type, job) を呼ぶ。HR が無ければ #contact へスクロール
 */
(function () {
  'use strict';

  var INTERVAL = 6500;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function prefersReduced() {
    return !!(reduceMotion && reduceMotion.matches);
  }

  /* ------------------------------------------------------------
   * 応募ボタン。main.js（window.HR）があれば HR 側が全 [data-apply-type] を処理する。
   * ここは main.js が読めなかった場合の保険（#contact へスクロール）
   * ---------------------------------------------------------- */
  function initApplyButtons() {
    if (window.HR && typeof window.HR.apply === 'function') return;
    var scopes = document.querySelectorAll('.hr-header, .hr-hero, .hr-mobile-cta');
    Array.prototype.forEach.call(scopes, function (scope) {
      scope.addEventListener('click', function (event) {
        var button = event.target.closest ? event.target.closest('[data-apply-type]') : null;
        if (!button || !scope.contains(button)) return;
        event.preventDefault();
        var type = button.getAttribute('data-apply-type') || 'apply';
        var job = button.getAttribute('data-apply-job') || '';
        callApply(type, job);
      });
    });
  }

  function callApply(type, job) {
    // メニューが開いていれば閉じる（HR が無い場合の fallback メニューを想定）
    var toggle = document.querySelector('[data-menu-toggle][aria-expanded="true"]');
    if (toggle) {
      try { toggle.click(); } catch (e) { /* noop */ }
    }
    if (window.HR && typeof window.HR.apply === 'function') {
      window.HR.apply(type, job);
      return;
    }
    var contact = document.getElementById('contact');
    if (!contact) return;
    contact.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
    var heading = contact.querySelector('h2, [tabindex="-1"]');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      try { heading.focus({ preventScroll: true }); } catch (e) { /* noop */ }
    }
  }

  /* ------------------------------------------------------------
   * スライド
   * ---------------------------------------------------------- */
  function initSlides(hero) {
    var scene = hero.querySelector('[data-hero-slides]');
    if (!scene) return;
    var slides = scene.querySelectorAll('[data-slide]');
    if (slides.length < 2) return;

    var index = 0;
    var timer = null;
    var paused = false;
    var pauseButton = hero.querySelector('[data-hero-pause]');
    var pauseText = hero.querySelector('[data-hero-pause-text]');

    // PC右カラムの人物写真（beginner / experienced）。スライド2枚目のときだけ experienced
    var persons = hero.querySelectorAll('[data-person-slide]');

    function show(next) {
      Array.prototype.forEach.call(slides, function (slide, i) {
        var active = i === next;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      var personIndex = next === 1 ? 1 : 0;
      Array.prototype.forEach.call(persons, function (slide, i) {
        slide.classList.toggle('is-active', i === personIndex);
      });
      index = next;
    }

    function tick() {
      if (document.hidden || paused) return;
      show((index + 1) % slides.length);
    }

    function start() {
      if (timer || paused || prefersReduced()) return;
      timer = window.setInterval(tick, INTERVAL);
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function setPaused(next) {
      paused = next;
      if (paused) {
        stop();
        hero.setAttribute('data-paused', '');
      } else {
        hero.removeAttribute('data-paused');
        start();
      }
      if (pauseButton) pauseButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
      if (pauseText) pauseText.textContent = paused ? '写真の切り替えを再開' : '写真の切り替えを停止';
    }

    if (pauseButton) {
      pauseButton.addEventListener('click', function () {
        setPaused(!paused);
      });
    }

    // 1枚目の画像が読めたら開始（読めるまで真っ暗な2枚目へ切り替わるのを防ぐ）
    var firstImg = slides[0].querySelector('img');
    if (!firstImg || firstImg.complete) {
      start();
    } else {
      firstImg.addEventListener('load', start, { once: true });
      firstImg.addEventListener('error', start, { once: true });
    }

    // OSの設定が途中で変わった場合にも追従
    if (reduceMotion && typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', function () {
        if (prefersReduced()) {
          stop();
        } else {
          start();
        }
      });
    }

    // 停止ボタンの表示：reduced-motion では切り替え自体が起きないので隠す
    if (pauseButton && prefersReduced()) {
      pauseButton.hidden = true;
    }
  }

  /* ------------------------------------------------------------
   * スマホ固定CTA
   * ---------------------------------------------------------- */
  function initMobileCta(hero) {
    var cta = document.querySelector('[data-mobile-cta]');
    if (!cta || !('IntersectionObserver' in window)) return;

    var contact = document.getElementById('contact');
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.getElementById('hr-mobile-menu');
    var button = cta.querySelector('button, a');

    var heroOut = false;
    var contactIn = false;
    var menuOpen = false;

    function update() {
      var visible = heroOut && !contactIn && !menuOpen;
      cta.setAttribute('data-visible', visible ? 'true' : 'false');
      cta.setAttribute('aria-hidden', visible ? 'false' : 'true');
      if (button) button.setAttribute('tabindex', visible ? '0' : '-1');
    }

    new IntersectionObserver(function (entries) {
      heroOut = !entries[0].isIntersecting;
      update();
    }, { threshold: 0 }).observe(hero);

    if (contact) {
      new IntersectionObserver(function (entries) {
        contactIn = entries[0].isIntersecting;
        update();
      }, { threshold: 0 }).observe(contact);
    }

    // メニューの開閉は main.js が aria-expanded / hidden を切り替える。属性の変化を見る
    function readMenu() {
      var expanded = toggle && toggle.getAttribute('aria-expanded') === 'true';
      var shown = menu && !menu.hidden;
      menuOpen = !!(expanded || shown);
      update();
    }
    if ('MutationObserver' in window) {
      var observer = new MutationObserver(readMenu);
      if (toggle) observer.observe(toggle, { attributes: true, attributeFilter: ['aria-expanded'] });
      if (menu) observer.observe(menu, { attributes: true, attributeFilter: ['hidden'] });
    }

    // フォーム入力中（ソフトキーボード表示中）は隠す
    if (contact) {
      contact.addEventListener('focusin', function () {
        contactIn = true;
        update();
      });
    }

    update();
  }

  /* ------------------------------------------------------------
   * main.js が無い場合の最小限のメニュー開閉（HR が定義されていれば何もしない）
   * ---------------------------------------------------------- */
  function initMenuFallback() {
    if (window.HR) return;
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.getElementById('hr-mobile-menu');
    if (!toggle || !menu || toggle.hasAttribute('data-hr-menu-bound')) return;
    toggle.setAttribute('data-hr-menu-bound', '');

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.hidden = !open;
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (event) {
      if (event.target.closest && event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------
   * 初期化
   * ---------------------------------------------------------- */
  function init() {
    if (init.done) return;
    init.done = true;
    var hero = document.querySelector('[data-hero]');
    initApplyButtons();
    initMenuFallback();
    if (hero) {
      initSlides(hero);
      initMobileCta(hero);
    }
  }

  if (window.HR && typeof window.HR.on === 'function') {
    window.HR.on('ready', init);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
