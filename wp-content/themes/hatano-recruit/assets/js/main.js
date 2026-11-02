/* hatano-recruit / main.js  [Lead]
 * <head> で同期実行される。html.js の付与、出現アニメ、モバイルメニュー、HR.apply。
 * 他モジュールは window.HR.on('name', fn) で登録する（DOM準備後に実行される）。
 */
(function () {
	'use strict';

	var doc = document;
	var root = doc.documentElement;

	// 1) 即時：JSが動いた印。これが無い＝CSSは何も隠さない.
	root.classList.add('js');

	var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// 2) モジュール登録.
	var modules = [];
	var domReady = false;

	function runModule(mod) {
		try {
			mod.fn(HR);
		} catch (err) {
			if (window.console && console.error) {
				console.error('[HR] module "' + mod.name + '" failed:', err);
			}
		}
	}

	function ready(fn) {
		if (doc.readyState === 'loading') {
			doc.addEventListener('DOMContentLoaded', fn, { once: true });
		} else {
			fn();
		}
	}

	var HR = {
		modules: modules,
		reducedMotion: reducedMotion,

		/** モジュール登録。DOM準備後に fn(HR) を呼ぶ。例外は他モジュールに波及しない. */
		on: function (name, fn) {
			if (typeof fn !== 'function') { return; }
			var mod = { name: String(name || 'anonymous'), fn: fn };
			modules.push(mod);
			if (domReady) { runModule(mod); }
		},

		/**
		 * フォームの用件・職種をセットして #contact へスクロール.
		 * @param {string} type  apply|visit|consult|other
		 * @param {string} [job] beginner|experienced|operator
		 */
		apply: function (type, job) {
			var form = doc.querySelector('#contact form') || doc.querySelector('form.hr-form') || doc.querySelector('#contact');
			if (!doc.getElementById('contact')) {
				// フォームの無いページ（/thanks/ など）ではトップのフォームへ移動する.
				var brand = doc.querySelector('.hr-brand');
				var base = brand && brand.getAttribute('href') ? brand.getAttribute('href').split('#')[0] : '/';
				window.location.href = base + '#contact';
				return;
			}
			if (type && form && form.querySelector) {
				var radio = form.querySelector('input[name="type"][value="' + cssEscape(type) + '"]');
				if (radio) {
					radio.checked = true;
					radio.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}
			if (job && form && form.querySelector) {
				var select = form.querySelector('select[name="job"]');
				if (select) {
					var has = false;
					for (var i = 0; i < select.options.length; i++) {
						if (select.options[i].value === job) { has = true; break; }
					}
					if (has) {
						select.value = job;
						select.dispatchEvent(new Event('change', { bubbles: true }));
					}
				}
			}
			var target = doc.getElementById('contact');
			if (!target) { return; }
			target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
			var first = target.querySelector('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([name="website"]), select, textarea');
			if (first) {
				// スクロール完了を待ってからフォーカス（スクロールを奪わないよう preventScroll）.
				window.setTimeout(function () {
					try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
				}, reducedMotion ? 0 : 450);
			}
		},

		/** 任意の要素へスクロール（ヘッダー分は CSS の scroll-margin-top が補正）. */
		scrollTo: function (id) {
			var el = typeof id === 'string' ? doc.getElementById(id.replace(/^#/, '')) : id;
			if (el) { el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); }
		}
	};

	function cssEscape(s) {
		return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
	}

	window.HR = HR;

	// 3) 出現アニメ.
	function setupReveal() {
		var items = doc.querySelectorAll('[data-reveal]');
		if (!items.length) { return; }

		function showAll() {
			for (var i = 0; i < items.length; i++) { items[i].classList.add('is-visible'); }
		}

		if (reducedMotion || !('IntersectionObserver' in window)) {
			showAll();
			return;
		}

		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					io.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

		for (var i = 0; i < items.length; i++) { io.observe(items[i]); }

		// 保険：4秒経ったら全部表示（監査05/10。何があっても読めるように）.
		window.setTimeout(function () {
			showAll();
			io.disconnect();
		}, 4000);

		// 印刷時も全部表示.
		window.addEventListener('beforeprint', showAll);
	}

	// 4) モバイルメニュー.
	function setupMenu() {
		var toggle = doc.querySelector('[data-menu-toggle]');
		var menu = doc.getElementById('hr-mobile-menu');
		if (!toggle || !menu) { return; }

		var labelOpen = toggle.getAttribute('data-label-open') || 'メニューを開く';
		var labelClose = toggle.getAttribute('data-label-close') || 'メニューを閉じる';

		function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

		function setOpen(open) {
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			toggle.setAttribute('aria-label', open ? labelClose : labelOpen);
			menu.hidden = !open;
			menu.classList.toggle('is-open', open);
			root.classList.toggle('hr-menu-open', open);
			if (open) {
				var firstLink = menu.querySelector('a, button');
				if (firstLink) { firstLink.focus(); }
			}
		}

		if (!toggle.hasAttribute('aria-controls')) { toggle.setAttribute('aria-controls', 'hr-mobile-menu'); }
		setOpen(false);

		toggle.addEventListener('click', function () { setOpen(!isOpen()); });

		// メニュー内リンクを押したら閉じる.
		menu.addEventListener('click', function (e) {
			var a = e.target.closest ? e.target.closest('a, button') : null;
			if (a) { setOpen(false); }
		});

		// Esc で閉じてトグルへフォーカス.
		doc.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && isOpen()) {
				setOpen(false);
				toggle.focus();
			}
		});

		// メニュー外クリックで閉じる.
		doc.addEventListener('click', function (e) {
			if (!isOpen()) { return; }
			if (menu.contains(e.target) || toggle.contains(e.target)) { return; }
			setOpen(false);
		});

		// PC幅に戻ったら閉じる.
		var mq = window.matchMedia('(min-width: 768px)');
		var onChange = function (ev) { if (ev.matches && isOpen()) { setOpen(false); } };
		if (mq.addEventListener) { mq.addEventListener('change', onChange); } else if (mq.addListener) { mq.addListener(onChange); }
	}

	// 5) data-apply-type を持つボタンは共通で HR.apply（各担当のJSで重ねて呼んでも害はない）.
	function setupApplyButtons() {
		doc.addEventListener('click', function (e) {
			var btn = e.target.closest ? e.target.closest('[data-apply-type]') : null;
			if (!btn) { return; }
			if (btn.tagName === 'A') { e.preventDefault(); }
			HR.apply(btn.getAttribute('data-apply-type') || '', btn.getAttribute('data-apply-job') || '');
		});
	}

	ready(function () {
		domReady = true;
		setupReveal();
		setupMenu();
		setupApplyButtons();
		modules.slice().forEach(runModule);
	});
})();
