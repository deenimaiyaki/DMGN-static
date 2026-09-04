/* DMGN — project enquiry form. Fully static: there is no backend.

   Without JS the form posts natively to its mailto: action, which opens the
   visitor's mail client. With JS we do the same thing but compose a readable,
   labelled message body first, and keep the inline validation and status UI.

   Client-side only. No fetch, no API, no credentials. */
(function () {
  "use strict";

  var form = document.getElementById("enquiry-form");
  if (!form) return;

  var status = document.getElementById("form-status");
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

  // Fields in the order they should appear in the email, with readable labels.
  var LABELS = [
    ["name", "Name"],
    ["company", "Company or organisation"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["projectType", "Project type"],
    ["budget", "Budget range"],
    ["timeline", "Timeline"],
    ["referral", "How they heard about us"],
    ["description", "Project description"]
  ];

  var MAILTO = form.getAttribute("action") || "mailto:contactdmgn@gmail.com";
  var ADDRESS = MAILTO.replace(/^mailto:/, "").split("?")[0];

  function compose(data) {
    var lines = [];
    LABELS.forEach(function (pair) {
      var value = (data[pair[0]] || "").trim();
      if (!value) return;
      // The description is free text, so give it its own block.
      if (pair[0] === "description") lines.push("", pair[1] + ":", value);
      else lines.push(pair[1] + ": " + value);
    });
    return lines.join("\n");
  }

  form.addEventListener("submit", function (event) {
    // Always take over: the native mailto post produces a far uglier message.
    event.preventDefault();

    var invalid = form.querySelectorAll(":invalid");
    if (invalid.length) {
      Array.prototype.forEach.call(invalid, showError);
      setStatus("error", "Please correct the highlighted fields.");
      invalid[0].focus();
      return;
    }

    var data = {};
    Array.prototype.forEach.call(form.elements, function (input) {
      if (input.name) data[input.name] = input.value;
    });

    var subject = "Project enquiry — " + (data.projectType || "General") + " — " + (data.name || "");
    var href =
      "mailto:" + ADDRESS +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(compose(data));

    setStatus(
      "ok",
      "Opening your email app with the brief ready to send. If nothing happens, email " +
        ADDRESS + " or call +234 906 762 8213."
    );
    if (status) status.focus();

    window.location.href = href;
  });
})();
