/* jobs.js — 募集職種（#jobs）
 * 1) <details class="hr-job-details"> の開閉で summary の文言を「募集要項を見る／閉じる」に切り替える
 * 2) #jobs / #pay 内の data-apply-type ボタン → HR.apply(type, job)。未定義なら #contact へ移動
 * JSなしでも details はネイティブで開閉でき、ボタンは #contact へのフォールバックが無いだけ（main.js の責務）。
 */
(function () {
	'use strict';

	var initialized = false;

	function syncLabel(details) {
		var summary = details.querySelector('summary');
		var label = details.querySelector('.hr-job-summary-label');
		if (!summary || !label) { return; }
		var open = summary.getAttribute('data-open-label') || '募集要項を見る';
		var close = summary.getAttribute('data-close-label') || '閉じる';
		label.textContent = details.open ? close : open;
	}

	function initDetails() {
		var list = document.querySelectorAll('.hr-job-details');
		Array.prototype.forEach.call(list, function (details) {
			syncLabel(details);
			details.addEventListener('toggle', function () {
				syncLabel(details);
				// 展開内容の末尾で閉じたとき、カードの見出しが画面外なら戻す
				if (!details.open) {
					var card = details.closest('.hr-job') || details;
					var rect = card.getBoundingClientRect();
					if (rect.top < 0) {
						var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
						card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
					}
				}
			});
		});
	}

	function fallbackToContact(type, job) {
		var target = document.getElementById('contact');
		if (!target) {
			window.location.hash = '#contact';
			return;
		}
		// HR.apply が無いときでも、フォーム側の select/radio があれば値だけ入れておく
		try {
			var form = target.querySelector('form');
			if (form) {
				if (job) {
					var select = form.querySelector('select[name="job"]');
					if (select) { select.value = job; }
				}
				if (type) {
					var radio = form.querySelector('input[name="type"][value="' + type + '"]');
					if (radio) { radio.checked = true; }
				}
			}
		} catch (e) { /* 値のセットは任意。失敗しても移動はする */ }
		var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		if (history && history.replaceState) { history.replaceState(null, '', '#contact'); }
	}

	function initApply() {
		var scopes = document.querySelectorAll('#jobs, #pay');
		Array.prototype.forEach.call(scopes, function (scope) {
			scope.addEventListener('click', function (event) {
				var button = event.target.closest ? event.target.closest('[data-apply-type]') : null;
				if (!button || !scope.contains(button)) { return; }
				event.preventDefault();
				var type = button.getAttribute('data-apply-type') || 'apply';
				var job = button.getAttribute('data-apply-job') || '';
				if (window.HR && typeof window.HR.apply === 'function') {
					window.HR.apply(type, job);
				} else {
					fallbackToContact(type, job);
				}
			});
		});
	}

	function init() {
		if (initialized) { return; }
		initialized = true;
		initDetails();
		initApply();
	}

	if (window.HR && typeof window.HR.on === 'function') {
		window.HR.on('jobs', init);
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
