document.querySelector("main").innerHTML =
  `<section class="container section contact-layout"><div><p class="eyebrow">OLMAX / KAMPINOS</p><h1 data-t="contactTitle"></h1><p class="lead" data-t="contactSub"></p><div class="contact-details"><div><span data-t="phone"></span><a class="contact-phone" href="tel:+48694219020">+48 694 219 020</a><p>Roman</p></div><div><span data-t="location"></span><h2 data-t="city"></h2><a href="https://www.google.com/maps/search/?api=1&query=Kampinos%2C%20Polska" target="_blank" rel="noopener noreferrer" data-t="map"></a></div><div><h3 data-t="visit"></h3><p data-t="visitText"></p></div></div></div><div class="panel"><h2 data-t="contact"></h2>${requestForm("contact-form")}</div></section>`;
bindRequestForm("contact-form");
translate();
