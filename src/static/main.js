let scrollToBottomEnabled = true;
const scrollToBottom = () => {
  scrollToBottomEnabled && window.scrollTo(0, document.body.scrollHeight);
  requestAnimationFrame(scrollToBottom);
};
scrollToBottom();
addEventListener('scrollend', () => scrollToBottomEnabled = Math.ceil(document.documentElement.scrollHeight - document.documentElement.scrollTop) === document.documentElement.clientHeight);
