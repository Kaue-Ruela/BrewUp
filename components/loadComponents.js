// Function to get base URL for GitHub Pages
function getBaseUrl() {
    const pathSegments = window.location.pathname.split('/');
    // If we're on GitHub Pages, the first segment after the domain will be the repo name
    const repoName = pathSegments[1];
    return window.location.hostname === 'localhost' ? '' : `/${repoName}`;
}

// Function to load components
async function loadComponents() {
    try {
        const baseUrl = getBaseUrl();
        // Determine if we're in the root directory of the site
        const currentPath = window.location.pathname;
        const isRoot = currentPath.endsWith(baseUrl + '/') || 
                      currentPath.endsWith('index.html') || 
                      currentPath === baseUrl;
        const basePath = isRoot ? 'components/' : '../components/';

        // Load navbar
        const navbarHtml = await loadFile(basePath + 'navbar.html');
        if (navbarHtml) {
            const navbarContainer = document.getElementById('navbar-container');
            if (navbarContainer) {
                navbarContainer.innerHTML = navbarHtml;
                // Adjust all navigation links to include base URL
                adjustNavLinks(baseUrl);
            }
        }

        // Load footer
        const footerHtml = await loadFile(basePath + 'footer.html');
        if (footerHtml) {
            const footerContainer = document.getElementById('footer-container');
            if (footerContainer) {
                footerContainer.innerHTML = footerHtml;
            }
        }

        // Update active nav link after loading navbar
        updateActiveNavLink();
    } catch (error) {
        console.error('Error loading components:', error);
    }
}

// Function to adjust nav links for GitHub Pages
function adjustNavLinks(baseUrl) {
    const navLinks = document.querySelectorAll('nav a, .logo');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http')) {
            // Remove any existing '../' from the start
            const cleanHref = href.replace(/^\.\.\//, '');
            // Add the base URL
            link.setAttribute('href', `${baseUrl}/${cleanHref}`);
        }
    });
}

// Function to load file content
async function loadFile(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Error loading file:', error);
        return '';
    }
}

// Function to update active nav link
function updateActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (currentPage === linkPage || 
            (currentPage === '' && linkPage === 'index.html') ||
            (currentPage === 'index.html' && linkPage === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Export functions
export { loadComponents, loadFile, updateActiveNavLink };

// Load components when the page loads
document.addEventListener('DOMContentLoaded', loadComponents); 