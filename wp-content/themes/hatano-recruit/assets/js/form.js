/* 応募フォーム：入力補助・二重送信防止・エラー表示（担当：FAQ・フォーム） */
(function () {
  'use strict';

  var form = document.querySelector('[data-hr-form]');
  if (!form) return;

  var submit = form.querySelector('[data-hr-submit]');
  var tel = form.querySelector('input[name="tel"]');
  var alertBox = form.querySelector('#hr-form-alert');
  var sending = false;

  // 全角数字・全角ハイフン → 半角。数字と「-」以外は落とす（サーバ側でも同じ正規化をする）
  function normalizeTel(value) {
    return value
      .replace(/[０-９]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xfee0); })
      .replace(/[－‐―ー]/g, '-')
      .replace(/[^\d-]/g, '');
  }

  if (tel) {
    tel.addEventListener('input', function () {
      var before = tel.value;
      var after = normalizeTel(before);
      if (before !== after) {
        var pos = tel.selectionStart;
        tel.value = after;
        if (typeof pos === 'number') {
          var delta = after.length - before.length;
          try { tel.setSelectionRange(pos + delta, pos + delta); } catch (e) { /* type=tel で非対応のブラウザがある */ }
        }
      }
    });
    tel.addEventListener('blur', function () {
      tel.value = normalizeTel(tel.value).replace(/-/g, '');
    });
  }

  // サーバ側エラーで戻ってきたときは、エラー文へフォーカス（role=alert は挿入時に読まれるので、常設＋フォーカスで確実に）
  if (alertBox && alertBox.textContent.trim() !== '' && /[?&](e|error)=/.test(location.search)) {
    var invalid = form.querySelector('[aria-invalid="true"]');
    window.setTimeout(function () {
      alertBox.focus();
      if (invalid && typeof invalid.focus === 'function' && invalid.tagName !== 'FIELDSET') {
        window.setTimeout(function () { invalid.focus(); }, 600);
      }
    }, 50);
  }

  // 入力し直したら赤枠とエラー文を消す
  form.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el && el.getAttribute && el.getAttribute('aria-invalid') === 'true') {
      el.removeAttribute('aria-invalid');
      var ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (id) { return id && id !== 'hr-form-alert'; });
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
    }
  });

  // 送信：ブラウザ標準の必須チェック → 通れば二重送信ロック
  form.addEventListener('submit', function (ev) {
    if (sending) { ev.preventDefault(); return; }

    if (tel) tel.value = normalizeTel(tel.value).replace(/-/g, '');

    form.classList.add('is-validated');
    if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
      ev.preventDefault();
      var first = form.querySelector(':invalid');
      // 折りたたみの中なら開いてからフォーカス
      var details = first && first.closest ? first.closest('details') : null;
      if (details && !details.open) details.open = true;
      if (first && typeof first.focus === 'function') first.focus();
      if (first && typeof first.reportValidity === 'function') first.reportValidity();
      return;
    }

    sending = true;
    if (submit) {
      submit.disabled = true;
      submit.setAttribute('aria-disabled', 'true');
      submit.dataset.label = submit.textContent;
      submit.textContent = '送信中…';
    }
    form.setAttribute('aria-busy', 'true');

    // 送信先に到達できず戻ってきた場合（bfcache）に備えて解除
    window.setTimeout(function () { unlock(); }, 15000);
  });

  function unlock() {
    sending = false;
    form.removeAttribute('aria-busy');
    if (submit) {
      submit.disabled = false;
      submit.removeAttribute('aria-disabled');
      if (submit.dataset.label) submit.textContent = submit.dataset.label;
    }
  }
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) unlock(); });
})();
