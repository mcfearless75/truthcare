/* Truth Care Tickets board — one script for list, ticket and staff pages. No framework, no build step. */
(function () {
  'use strict';

  var page = document.body.dataset.page;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var LABELS = {
    status: { open: 'Open', in_progress: 'In progress', closed: 'Closed' },
    category: { referral: 'Referral', staff: 'Staff', resident_concern: 'Resident concern', general: 'General' },
    source: { phone: 'phone', email: 'email', board: 'board' },
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function badge(kind, value) {
    var label = (LABELS[kind] && LABELS[kind][value]) || value;
    if (kind === 'priority') label = String(value || 'normal').toUpperCase();
    return '<span class="badge ' + kind + (kind === 'category' ? '' : '-' + esc(value)) + '">' + esc(label) + '</span>';
  }
  function notice(kind, text) {
    var box = $('[data-notice]');
    if (!box) return;
    box.innerHTML = text ? '<div class="notice ' + kind + '">' + esc(text) + '</div>' : '';
    if (text && kind === 'ok') setTimeout(function () { if (box.textContent === text) box.innerHTML = ''; }, 4000);
  }

  function api(url, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    return fetch(url, init).then(function (res) {
      if (res.status === 401) { window.location.href = '/api/auth?action=login'; throw new Error('Sign in required'); }
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
        return data;
      });
    });
  }

  function showUser(user) {
    if (!user) return;
    $$('[data-user-name]').forEach(function (el) { el.textContent = user.name; });
    if (user.role === 'admin') $$('[data-admin-only]').forEach(function (el) { el.hidden = false; });
  }

  function fillStaffSelects(staff, keepFirst) {
    $$('[data-staff-select]').forEach(function (sel) {
      var current = sel.value;
      var fixed = Array.prototype.slice.call(sel.options, 0, keepFirst === undefined ? 1 : keepFirst);
      sel.innerHTML = '';
      fixed.forEach(function (o) { sel.appendChild(o); });
      if (sel.name === 'assignedTo' && !fixed.some(function (o) { return o.value === 'unassigned'; })) {
        var un = document.createElement('option'); un.value = 'unassigned'; un.textContent = 'Unassigned'; sel.appendChild(un);
      }
      staff.forEach(function (s) {
        var o = document.createElement('option'); o.value = s.id; o.textContent = s.name; sel.appendChild(o);
      });
      sel.value = current;
    });
  }

  // ── list page ─────────────────────────────────────────────────────────────
  function listPage() {
    var form = $('[data-filters]');
    var rows = $('[data-ticket-rows]');
    var params = new URLSearchParams(window.location.search);
    $$('select, input', form).forEach(function (el) { if (params.has(el.name)) el.value = params.get(el.name); });

    function load() {
      var q = new URLSearchParams(new FormData(form));
      history.replaceState(null, '', q.toString() ? '?' + q : window.location.pathname);
      rows.innerHTML = '<tr><td colspan="6" class="empty">Loading…</td></tr>';
      api('/api/tickets?action=list&' + q).then(function (data) {
        showUser(data.user);
        fillStaffSelects(data.staff, 2);
        if (!data.tickets.length) { rows.innerHTML = '<tr><td colspan="6" class="empty">No tickets match.</td></tr>'; return; }
        rows.innerHTML = data.tickets.map(function (t) {
          var warn = Number(t.failedNotifications) > 0 ? ' <span class="badge priority-urgent" title="An email for this ticket could not be sent">email failed</span>' : '';
          return '<tr class="clickable ' + esc(t.priority) + '" data-href="/t/' + t.number + '">' +
            '<td class="num">TC-' + t.number + '</td>' +
            '<td><div class="subject">' + esc(t.subject || t.summary || '(no subject)') + '</div><div class="sub">' + badge('priority', t.priority) + badge('category', t.category) + esc(t.subjectPerson ? 're: ' + t.subjectPerson : '') + warn + '</div></td>' +
            '<td>' + esc(t.callerName || 'Unknown') + '<div class="sub">' + esc(t.callerPhone || t.callerEmail || '') + '</div></td>' +
            '<td>' + badge('status', t.status) + '</td>' +
            '<td>' + esc(t.assigneeName || '—') + '</td>' +
            '<td class="num">' + esc(when(t.createdAt)) + '<div class="sub">via ' + esc(LABELS.source[t.source] || t.source) + '</div></td></tr>';
        }).join('');
      }).catch(function (e) { notice('error', e.message); });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); load(); });
    $$('select', form).forEach(function (s) { s.addEventListener('change', load); });
    rows.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-href]');
      if (tr) window.location.href = tr.dataset.href;
    });

    var create = $('[data-create]');
    create.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = {};
      new FormData(create).forEach(function (v, k) { if (String(v).trim()) body[k] = String(v).trim(); });
      api('/api/tickets?action=create', { method: 'POST', body: body }).then(function (data) {
        window.location.href = '/t/' + data.ticket.number;
      }).catch(function (err) { notice('error', err.message); });
    });

    load();
  }

  // ── ticket page ───────────────────────────────────────────────────────────
  function ticketPage() {
    var number = Number((window.location.pathname.match(/\/t\/(\d+)/) || [])[1]);
    if (!number) { notice('error', 'No ticket number in the address.'); return; }
    var busy = false;

    function render(d) {
      var t = d.ticket;
      showUser(d.user);
      document.title = 'TC-' + t.number + ' — Truth Care Group Tickets';
      $('[data-ticket-title]').textContent = 'TC-' + t.number + ' · ' + (t.subject || LABELS.category[t.category] || 'Ticket');
      $('[data-ticket-badges]').innerHTML = badge('status', t.status) + badge('priority', t.priority) + badge('category', t.category);
      $('[data-ticket-summary]').textContent = t.summary || '';
      var facts = [
        ['Caller', [t.callerName, t.callerOrg ? '(' + t.callerOrg + ')' : '', t.callerPhone, t.callerEmail].filter(Boolean).join(' · ') || 'Unknown'],
        ['About', t.subjectPerson || '—'],
        ['Assigned to', d.assignee ? d.assignee.name : 'Unassigned'],
        ['Logged', 'via ' + (LABELS.source[t.source] || t.source) + ' ' + when(t.createdAt)],
        ['Updated', when(t.updatedAt)],
        ['Closed', t.closedAt ? when(t.closedAt) : '—'],
        ['Reply-to', 'tickets+tc' + t.number + '-' + t.emailToken + '@' + (window.location.hostname.replace(/^tickets\./, '') || 'truthcaregroup.co.uk')],
      ];
      $('[data-ticket-facts]').innerHTML = facts.map(function (f) { return '<dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('');

      var thread = $('[data-thread]');
      thread.innerHTML = d.notes.length ? d.notes.map(function (n) {
        var cls = n.authorType === 'caller' ? 'caller' : n.authorType === 'ai' ? 'ai' : n.isInternal ? 'internal' : '';
        var who = n.authorName || n.authorType;
        var tag = n.isInternal ? ' · internal' : n.authorType === 'caller' ? ' · from the caller' : n.authorType === 'staff' ? ' · public, sent to caller if known' : '';
        return '<li class="' + cls + '"><div class="meta">' + esc(who) + esc(tag) + ' · ' + esc(when(n.createdAt)) + '</div><div class="body">' + esc(n.body) + '</div></li>';
      }).join('') : '<li class="empty">No notes yet.</li>';

      $('[data-events]').innerHTML = d.events.map(function (ev) {
        var text = ev.event === 'created' ? 'Created (' + ev.toValue + ')' : ev.event === 'assigned' ? 'Assigned to ' + (ev.toValue || 'nobody') : ev.event + ': ' + (ev.fromValue || '—') + ' → ' + (ev.toValue || '—');
        return '<li>' + esc(when(ev.createdAt)) + ' · ' + esc(text) + (ev.actor ? ' by ' + esc(ev.actor) : '') + ' · via ' + esc(ev.via) + '</li>';
      }).join('') || '<li>No history.</li>';

      fillStaffSelects(d.staff, 1);
      $('[data-assign]').value = t.assignedTo || '';
      $('[data-command-select="priority"]').value = t.priority;
      $('[data-command-select="category"]').value = t.category;
      $$('[data-command="status"]').forEach(function (b) { b.disabled = b.dataset.value === t.status; });

      var failed = $('[data-failed-notifications]');
      if (d.failedNotifications && d.failedNotifications.length) {
        failed.hidden = false;
        failed.textContent = d.failedNotifications.length + ' email(s) could not be sent after 5 attempts: ' + d.failedNotifications.map(function (f) { return f.kind + ' → ' + f.recipient + ' (' + (f.lastError || 'unknown error') + ')'; }).join('; ');
      } else { failed.hidden = true; }
    }

    function load() {
      return api('/api/tickets?action=get&number=' + number).then(render).catch(function (e) { notice('error', e.message); });
    }

    function command(type, value) {
      if (busy) return;
      busy = true;
      api('/api/tickets?action=command&number=' + number, { method: 'POST', body: { type: type, value: value } })
        .then(function () { notice('ok', 'Done — notifications sent.'); return load(); })
        .catch(function (e) { notice('error', e.message); })
        .then(function () { busy = false; });
    }

    $('[data-assign]').addEventListener('change', function (e) {
      var opt = e.target.selectedOptions[0];
      if (e.target.value) command('assign', opt.textContent);
    });
    $$('[data-command]').forEach(function (b) {
      b.addEventListener('click', function () { command(b.dataset.command, b.dataset.value); });
    });
    $$('[data-command-select]').forEach(function (s) {
      s.addEventListener('change', function () { command(s.dataset.commandSelect, s.value); });
    });
    var noteForm = $('[data-note]');
    noteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(noteForm);
      var body = String(fd.get('body') || '').trim();
      if (!body) return;
      command(fd.get('internal') ? 'internal_note' : 'note', body);
      noteForm.reset();
    });

    load();
  }

  // ── staff page ────────────────────────────────────────────────────────────
  function staffPage() {
    var form = $('[data-staff-form]');
    var rows = $('[data-staff-rows]');
    var list = [];

    function fill(s) {
      form.name.value = s ? s.name : '';
      form.email.value = s ? s.email : '';
      form.role.value = s ? s.role : 'agent';
      form.aliases.value = s ? (s.aliases || []).join(', ') : '';
      form.receivesNewTickets.checked = s ? s.receivesNewTickets !== false : true;
      form.active.checked = s ? s.active !== false : true;
      $('[data-form-title]').textContent = s ? 'Edit ' + s.name : 'Add a member of staff';
      form.name.focus();
    }

    function load() {
      api('/api/staff?action=list').then(function (data) {
        showUser(data.user);
        list = data.staff;
        if (data.user.role !== 'admin') { form.hidden = true; notice('warn', 'Only admins can change the staff list.'); }
        rows.innerHTML = list.map(function (s, i) {
          return '<tr' + (s.active === false ? ' class="high"' : '') + '><td>' + esc(s.name) + '</td><td>' + esc(s.email) + '</td><td>' + esc(s.role) + '</td><td>' + esc((s.aliases || []).join(', ')) + '</td>' +
            '<td>' + (s.receivesNewTickets !== false ? 'Yes' : 'No') + '</td><td>' + (s.active === false ? 'No' : 'Yes') + '</td>' +
            '<td>' + (data.user.role === 'admin' ? '<button class="btn small ghost" type="button" data-edit="' + i + '">Edit</button> ' + (s.active !== false && s.email !== data.user.email ? '<button class="btn small danger" type="button" data-deactivate="' + i + '">Deactivate</button>' : '') : '') + '</td></tr>';
        }).join('') || '<tr><td colspan="7" class="empty">Nobody yet.</td></tr>';
      }).catch(function (e) { notice('error', e.message); });
    }

    function save(body) {
      return api('/api/staff?action=save', { method: 'POST', body: body }).then(function () { notice('ok', 'Saved.'); fill(null); load(); }).catch(function (e) { notice('error', e.message); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      save({ name: form.name.value, email: form.email.value, role: form.role.value, aliases: form.aliases.value, receivesNewTickets: form.receivesNewTickets.checked, active: form.active.checked });
    });
    $('[data-reset]').addEventListener('click', function () { fill(null); });
    rows.addEventListener('click', function (e) {
      var edit = e.target.closest('[data-edit]');
      var off = e.target.closest('[data-deactivate]');
      if (edit) fill(list[Number(edit.dataset.edit)]);
      if (off) {
        var s = list[Number(off.dataset.deactivate)];
        if (window.confirm('Deactivate ' + s.name + '? They will lose access immediately.')) {
          save({ name: s.name, email: s.email, role: s.role, aliases: s.aliases, receivesNewTickets: s.receivesNewTickets, active: false });
        }
      }
    });

    load();
  }

  if (page === 'list') listPage();
  else if (page === 'ticket') ticketPage();
  else if (page === 'staff') staffPage();
})();
