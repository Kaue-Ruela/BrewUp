import { auth, db } from '../firebase.js';
import { doc, onSnapshot, getDoc, collection, query, where, orderBy, limit, setDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

function renderStatus(status) {
  const statusInfo = document.getElementById('status-info');
  let statusText = '';
  let statusClass = '';
  
  switch (status) {
    case 'pending':
      statusText = 'Pedido recebido! Aguardando confirmação.';
      statusClass = 'pending';
      break;
    case 'accepted':
      statusText = 'Pedido aceito! Estamos preparando seu café.';
      statusClass = 'accepted';
      break;
    case 'preparing':
      statusText = 'Seu pedido está sendo preparado.';
      statusClass = 'preparing';
      break;
    case 'sent':
      statusText = 'Seu pedido saiu para entrega!';
      statusClass = 'sent';
      break;
    case 'delivered':
      statusText = 'Pedido entregue! Bom café!';
      statusClass = 'delivered';
      break;
    default:
      statusText = 'Aguardando atualização do pedido...';
      statusClass = 'pending';
  }
  
  statusInfo.innerHTML = `
    <i class="fas fa-circle-info"></i>
    ${statusText}
    <span class="status-badge ${statusClass}">${getStatusBadgeText(status)}</span>
  `;
}

function getStatusBadgeText(status) {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'accepted': return 'Aceito';
    case 'preparing': return 'Preparando';
    case 'sent': return 'Em Entrega';
    case 'delivered': return 'Entregue';
    default: return 'Aguardando';
  }
}

function renderTimer(createdAt, deliveredAt) {
  const timerInfo = document.getElementById('timer-info');
  if (!createdAt) {
    console.log('No createdAt timestamp provided');
    timerInfo.textContent = '';
    return;
  }

  console.log('Raw createdAt:', createdAt);
  
  // Convert Firestore Timestamp to Date
  let startDate;
  try {
    // If it's a Firestore Timestamp
    if (createdAt.toDate && typeof createdAt.toDate === 'function') {
      startDate = createdAt.toDate();
    }
    // If it's a server timestamp object
    else if (createdAt.seconds !== undefined) {
      startDate = new Date(createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1000000);
    }
    // If it's already a Date object
    else if (createdAt instanceof Date) {
      startDate = createdAt;
    }
    // If it's a date string
    else if (typeof createdAt === 'string') {
      startDate = new Date(createdAt);
    }
    // If it's a number (timestamp)
    else if (typeof createdAt === 'number') {
      startDate = new Date(createdAt);
    }
    else {
      throw new Error('Unsupported date format');
    }
    
    console.log('Converted startDate:', startDate);
    
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid date after conversion');
    }
  } catch (error) {
    console.error('Error converting start date:', error);
    timerInfo.textContent = 'Erro ao calcular tempo';
    return;
  }

  // Convert deliveredAt if exists
  let endDate = null;
  if (deliveredAt) {
    try {
      if (deliveredAt.toDate && typeof deliveredAt.toDate === 'function') {
        endDate = deliveredAt.toDate();
      }
      else if (deliveredAt.seconds !== undefined) {
        endDate = new Date(deliveredAt.seconds * 1000 + (deliveredAt.nanoseconds || 0) / 1000000);
      }
      else if (deliveredAt instanceof Date) {
        endDate = deliveredAt;
      }
      else if (typeof deliveredAt === 'string') {
        endDate = new Date(deliveredAt);
      }
      else if (typeof deliveredAt === 'number') {
        endDate = new Date(deliveredAt);
      }
      
      console.log('Converted endDate:', endDate);
      
      if (isNaN(endDate.getTime())) {
        console.warn('Invalid end date after conversion, ignoring deliveredAt');
        endDate = null;
      }
    } catch (error) {
      console.warn('Error converting end date, ignoring deliveredAt:', error);
      endDate = null;
    }
  }
  
  let lastUpdate = 0;
  function update() {
    try {
      const now = Date.now();
      // Only update every 100ms to improve performance
      if (now - lastUpdate < 100) {
        requestAnimationFrame(update);
        return;
      }
      lastUpdate = now;
      
      const currentTime = endDate ? endDate.getTime() : now;
      const startTime = startDate.getTime();
      const diff = Math.max(0, currentTime - startTime);
      
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      
      timerInfo.innerHTML = `
        <i class="fas fa-clock"></i>
        ${endDate ? 'Tempo total:' : 'Tempo desde o pedido:'} 
        <strong>${min}m ${sec < 10 ? '0' : ''}${sec}s</strong>
      `;
      
      if (!endDate) {
        requestAnimationFrame(update);
      }
    } catch (error) {
      console.error('Error updating timer:', error);
      timerInfo.textContent = 'Erro ao atualizar tempo';
    }
  }
  
  update();
}

function renderOrderInfo(order) {
  const orderInfo = document.getElementById('order-info');
  if (!order || !order.items || order.items.length === 0) {
    orderInfo.innerHTML = '<p>Nenhum item no pedido.</p>';
    return;
  }

  let total = order.items.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);
  
  let html = `
    <ul>
      ${order.items.map(item => `
        <li>
          <span>${item.quantity || 1}x ${item.name}</span>
          <span>R$ ${(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
        </li>
      `).join('')}
      <li style="margin-top:10px;border-top:2px solid rgba(255,255,255,0.1);padding-top:10px;">
        <strong>Total</strong>
        <strong>R$ ${total.toFixed(2)}</strong>
      </li>
    </ul>
  `;
  
  if (order.endereco) {
    html += `
      <div style="margin-top:15px;padding-top:15px;border-top:1px solid rgba(255,255,255,0.1);">
        <i class="fas fa-map-marker-alt"></i>
        <strong>Endereço de Entrega:</strong><br>
        ${order.endereco}
      </div>
    `;
  }
  
  orderInfo.innerHTML = html;
}

function renderContactInfo(order) {
  const contactInfo = document.getElementById('contact-info');
  if (!order) {
    contactInfo.textContent = '';
    return;
  }
  
  let html = '';
  
  if (order.nomeCompleto) {
    html += `
      <div>
        <i class="fas fa-user"></i>
        <span>${order.nomeCompleto}</span>
      </div>
    `;
  }
  
  if (order.telefone) {
    html += `
      <div>
        <i class="fas fa-phone"></i>
        <a href="tel:${order.telefone}" style="color:#fff;text-decoration:none;">
          ${order.telefone}
        </a>
      </div>
    `;
  }
  
  if (order.observacao) {
    html += `
      <div>
        <i class="fas fa-comment"></i>
        <span>${order.observacao}</span>
      </div>
    `;
  }
  
  contactInfo.innerHTML = html || '<p>Nenhuma informação de contato disponível.</p>';
}

function listenOrder(userId) {
  const q = query(
    collection(db, "orders"),
    where("userId", "==", userId),
    where("type", "==", "delivery"),
    where("status", "not-in", ["delivered", "cancelled"]),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  
  const unsubscribe = onSnapshot(q, {
    next: (snapshot) => {
      try {
        if (snapshot.empty) {
          console.log('No active delivery orders found for user:', userId);
          document.getElementById('status-info').innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            Nenhum pedido encontrado.
          `;
          document.getElementById('timer-info').textContent = '';
          document.getElementById('order-info').innerHTML = '<p>Nenhum pedido ativo.</p>';
          document.getElementById('contact-info').textContent = '';
          return;
        }
        
        const orderDoc = snapshot.docs[0];
        const order = orderDoc.data();
        console.log('Latest order data:', order);
        
        // Update UI with order status
        renderStatus(order.status);
        renderTimer(order.createdAt, order.deliveredAt);
        renderOrderInfo(order);
        renderContactInfo(order);
        
        // If order is delivered, show completion message
        if (order.status === 'delivered' && !order.notificationShown) {
          const msg = document.createElement('div');
          msg.textContent = 'Pedido entregue com sucesso!';
          msg.style.position = 'fixed';
          msg.style.bottom = '100px';
          msg.style.right = '50px';
          msg.style.background = '#28a745';
          msg.style.color = '#fff';
          msg.style.padding = '1rem 2rem';
          msg.style.borderRadius = '10px';
          msg.style.fontWeight = 'bold';
          msg.style.zIndex = 3000;
          document.body.appendChild(msg);
          
          setTimeout(() => {
            msg.remove();
          }, 5000);
          
          // Update order to mark notification as shown
          try {
            setDoc(doc(db, 'orders', orderDoc.id), { notificationShown: true }, { merge: true });
          } catch (error) {
            console.error('Error updating notification status:', error);
          }
        }
      } catch (error) {
        console.error('Error processing order data:', error);
        document.getElementById('status-info').innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          Erro ao carregar dados do pedido. Por favor, atualize a página.
        `;
      }
    },
    error: (error) => {
      console.error('Error listening to order updates:', error);
      document.getElementById('status-info').innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        Erro ao monitorar atualizações do pedido. Por favor, atualize a página.
      `;
    }
  });
  
  // Store unsubscribe function for cleanup
  window.addEventListener('beforeunload', () => unsubscribe());
}

// Function to get base URL for GitHub Pages
function getBaseUrl() {
    const pathSegments = window.location.pathname.split('/');
    // If we're on GitHub Pages, the first segment after the domain will be the repo name
    const repoName = pathSegments[1];
    return window.location.hostname === 'localhost' ? '' : `/${repoName}`;
}

// Função para verificar se o usuário está logado e tem um pedido ativo
async function checkUserAndOrder() {
    const user = auth.currentUser;
    
    if (!user) {
        // Se não estiver logado
        showMessage("Por favor faça login e um pedido para acessar a página de delivery", true);
        return false;
    }

    // Verifica se existe um pedido ativo
    try {
        const ordersRef = collection(db, "orders");
        const q = query(
            ordersRef,
            where("userId", "==", user.uid),
            where("type", "==", "delivery"),
            where("status", "not-in", ["delivered", "cancelled"]),
            orderBy("createdAt", "desc"),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            // Se não houver pedido ativo
            showMessage("Por favor faça um pedido para acessar a página de delivery", false);
            return false;
        }

        // Se encontrou um pedido ativo, mostra o conteúdo principal
        const mainContent = document.querySelector('.delivery-status-main');
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        // Remove a mensagem se ela existir
        const messageContainer = document.querySelector('.message-container');
        if (messageContainer) {
            messageContainer.remove();
        }

        return true;
    } catch (error) {
        console.error("Erro ao verificar pedido:", error);
        showMessage("Erro ao verificar status do pedido", true);
        return false;
    }
}

// Função para mostrar mensagem
function showMessage(message, isError) {
    // Esconde o conteúdo principal
    const mainContent = document.querySelector('.delivery-status-main');
    if (mainContent) {
        mainContent.style.display = 'none';
        mainContent.insertAdjacentHTML('beforebegin', `
            <div class="message-container" style="
                text-align: center;
                padding: 40px 20px;
                background: ${isError ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,0,0.1)'};
                border-radius: 10px;
                margin: 20px;
            ">
                <i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-info-circle'}" style="
                    font-size: 48px;
                    color: ${isError ? '#ff4444' : '#d4a373'};
                    margin-bottom: 20px;
                    display: block;
                "></i>
                <h2 style="
                    color: #ffffff;
                    margin-bottom: 10px;
                ">Antes de entrar nesta página</h2>
                <p style="
                    color: #ffffff;
                    opacity: 0.8;
                ">${message}</p>
                <button onclick="window.location.href='${getBaseUrl()}/menu/menu.html'" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #d4a373;
                    border: none;
                    border-radius: 5px;
                    color: white;
                    cursor: pointer;
                ">Ir para o Menu</button>
            </div>
        `);
    }
}

function init() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            console.log('User not authenticated, redirecting to index');
            window.location.href = getBaseUrl() + '/';
            return;
        }
        
        const hasAccess = await checkUserAndOrder();
        if (hasAccess) {
            console.log('User authenticated and has active order, starting order listener');
            listenOrder(user.uid);
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
