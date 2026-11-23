// Cosmetic enhancement only; no form submit, OTP, booking, or security behavior changed.
(function(){
  const pathname=window.location.pathname;
  document.querySelectorAll('.dm-nav-link').forEach(link=>{
    const href=link.getAttribute('href')||'';
    if((href==='/'&&pathname==='/') || (href==='/inventory'&&pathname==='/inventory')){
      link.classList.add('is-active');link.setAttribute('aria-current','page');
    }
  });
  document.addEventListener('click',e=>{
    document.querySelectorAll('.dm-account-dropdown[open]').forEach(d=>{
      if(!d.contains(e.target))d.removeAttribute('open');
    });
  });
})();
