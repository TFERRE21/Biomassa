// Configure o número comercial antes de publicar.
const WHATSAPP_NUMBER = '5561999957404';

document.getElementById('leadForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const msg = `Olá! Quero solicitar uma cotação de biomassa.%0A%0AEmpresa: ${encodeURIComponent(data.get('empresa'))}%0AContato: ${encodeURIComponent(data.get('nome'))}%0ATelefone: ${encodeURIComponent(data.get('telefone'))}%0AE-mail: ${encodeURIComponent(data.get('email') || '')}%0ASegmento: ${encodeURIComponent(data.get('segmento'))}%0AConsumo: ${encodeURIComponent(data.get('consumo'))} m³/dia%0ANecessidade: ${encodeURIComponent(data.get('mensagem') || '')}`;
  if (WHATSAPP_NUMBER === 'SEU_NUMERO_COM_DDI') {
    alert('O formulário está pronto. Configure o número do WhatsApp no arquivo script.js antes de publicar.');
    return;
  }
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank', 'noopener');
});
