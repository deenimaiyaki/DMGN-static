/* DMGN — project enquiry form. Progressive enhancement: the form posts
   natively without JS; with JS it submits over fetch and reports inline. */
(function () {
  "use strict";

  var form = document.getElementById("enquiry-form");
  if (!form) return;

  var status = document.getElementById("form-status");
  var submit = form.querySelector('button[type="submit"]');
  var submitLabel = submit ? submit.textContent : "";

  var messages = {
    valueMissing: "This field is required.",
    typeMismatch: {
      email: "Enter a valid email address, e.g. name@company.com.",
      tel: "Enter a valid phone number."
    },
    tooShort: "Please add a little more detail."
  };

  function errorFor(input) {
    var v = input.validity;
    if (v.valueMissing) return messages.valueMissing;
    if (v.typeMismatch) return messages.typeMismatch[input.type] || "Check this value.";
    if (v.tooShort) return messages.tooShort;
    return input.validationMessage || "Check this value.";
  }

  function slot(input) {
    return document.getElementById(input.id + "-error");
  }

  function showError(input) {
    var el = slot(input);
    input.setAttribute("aria-invalid", "true");
    if (el) {
      el.innerHTML =
        '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">' +
        '<circle cx="8" cy="8" r="6.5"/><path d="M8 4.8v3.6M8 11.1h.01"/></svg>' +
        "<span>" + errorFor(input) + "</span>";
    }
  }

  function clearError(input) {
    input.removeAttribute("aria-invalid");
    var el = slot(input);
    if (el) el.textContent = "";
  }

  // Validate on blur, not on keystroke.
  Array.prototype.forEach.call(form.elements, function (input) {
    if (!input.name || input.type === "submit") return;
    input.addEventListener("blur", function () {
      if (!input.value && !input.required) return clearError(input);
      input.checkValidity() ? clearError(input) : showError(input);
    });
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true" && input.checkValidity()) clearError(input);
    });
  });

  function setStatus(state, text) {
    if (!status) return;
    status.dataset.state = state;
    status.textContent = text;
  }

  form.addEventListener("submit", function (event) {
    var invalid = form.querySelectorAll(":invalid");
    if (invalid.length) {
      event.preventDefault();
      Array.prototype.forEach.call(invalid, showError);
      setStatus("error", "Please correct the highlighted fields.");
      invalid[0].focus();
      return;
    }

    event.preventDefault();
    setStatus("", "");
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Sending…";
    }

    fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.data.error || "Request failed");
        form.reset();
        setStatus(
          "ok",
          "Thank you — your enquiry has reached us. We reply to every project brief within two working days."
        );
        if (status) status.focus();
      })
      .catch(function () {
        setStatus(
          "error",
          "We could not send your enquiry. Please email contactdmgn@gmail.com or call +234 906 762 8213."
        );
      })
      .finally(function () {
        if (submit) {
          submit.disabled = false;
          submit.textContent = submitLabel;
        }
      });
  });
})();
