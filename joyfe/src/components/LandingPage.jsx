import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage = ({ onLoginClick }) => {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedAdminPhone, setSelectedAdminPhone] = useState('');
  const [admins, setAdmins] = useState([]); // State to store fetched admins
  const [loading, setLoading] = useState(true); // Loading state for fetching admins
  const [error, setError] = useState(null); // Error state for fetch failures

  // State for form submissions
  const [consultForm, setConsultForm] = useState({
    childName: '',
    password: '',
    phoneNumber: '',
    therapistNumber: '',
    adminName: '', // Added adminName field
  });
  const [adminForm, setAdminForm] = useState({
    name: '',
    password: '',
    phoneNumber: '',
    occupation: '',
    bio: '',
  });
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Function to compute initials from username
  const computeInitials = (username) => {
    if (!username) return '';
    const words = username.split(' ');
    return words.map(word => word.charAt(0).toUpperCase()).join('');
  };

  // Function to parse admin data
  const parseAdminData = (admin) => {
    return {
      name: admin.username || 'Not specified',
      initial: computeInitials(admin.username),
      experience: 'Not specified', // Not present in provided data
      age: 0, // Not present in provided data
      occupation: admin.occupation || 'Not specified',
      location: 'Not specified', // Not present in provided data
      phone: admin.phone || 'Not specified',
      bio: admin.bio || 'No bio provided',
      links: ['No links provided'], // Not present in provided data
    };
  };

  // Fetch admins from the backend
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/admins');
        if (!response.ok) {
          throw new Error('Failed to fetch admins');
        }
        const data = await response.json();
        // Filter for non-super admins, exclude those with password "therapist"
        const filteredAdmins = data.filter(admin => !admin.isSuperAdmin && admin.password !== 'therapist');
        // Parse each admin's data
        const parsedAdmins = filteredAdmins.map(parseAdminData);
        setAdmins(parsedAdmins);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching admins:', err);
        setError('Unable to load admins. Please try again later.');
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  // Open modal function
  const openModal = (modalId) => {
    setActiveModal(modalId);
    setFormError(null);
    setFormSuccess(null);
  };

  // Close modal function
  const closeModal = () => {
    setActiveModal(null);
    setSelectedAdminPhone('');
    setFormError(null);
    setFormSuccess(null);
    // Reset forms
    setConsultForm({ childName: '', password: '', phoneNumber: '', therapistNumber: '', adminName: '' });
    setAdminForm({ name: '', password: '', phoneNumber: '', occupation: '', bio: '' });
  };

  // Handle click outside modal
  const handleOutsideClick = (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal();
    }
  };

  // Show admin profile
  const handleShowProfile = (index) => {
    setSelectedAdmin(admins[index]);
    setShowProfile(true);
  };

  // Show consult modal
  const handleConsultClick = (phone, adminName, e) => {
    e.stopPropagation();
    setSelectedAdminPhone(phone);
    setConsultForm(prev => ({
      ...prev,
      therapistNumber: phone,
      adminName: adminName, // Set adminName in consultForm
    }));
    openModal('consultModal');
  };

  // Show carousel
  const handleShowCarousel = () => {
    setShowProfile(false);
    setSelectedAdmin(null);
  };

  // Navigate carousel
  const navigateCarousel = (direction) => {
    const carousel = document.querySelector(".carousel");
    if (!carousel) return;

    const items = carousel.querySelectorAll(".carousel-item");
    if (items.length === 0) return; // Guard against empty carousel

    const itemWidth = items[0].offsetWidth + 16; // Width of item + gap (1rem = 16px)
    const totalItems = items.length;
    const itemsPerView = 4; // Number of items to show at a time
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const currentScroll = carousel.scrollLeft;
    const tolerance = 1; // Small tolerance for floating-point inaccuracies

    let currentIndex = Math.round(currentScroll / itemWidth);

    if (direction < 0) {
      if (currentScroll <= tolerance) {
        const lastGroupStartIndex = Math.max(0, totalItems - itemsPerView);
        carousel.scrollTo({ left: lastGroupStartIndex * itemWidth, behavior: 'smooth' });
      } else {
        const newIndex = Math.max(0, currentIndex - itemsPerView);
        carousel.scrollTo({ left: newIndex * itemWidth, behavior: 'smooth' });
      }
    } else {
      if (currentScroll >= maxScroll - tolerance) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const newIndex = Math.min(totalItems - itemsPerView, currentIndex + itemsPerView);
        carousel.scrollTo({ left: newIndex * itemWidth, behavior: 'smooth' });
      }
    }
  };

  // Handle consult form input changes
  const handleConsultInputChange = (e) => {
    const { name, value } = e.target;
    setConsultForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle consult form submission
  const handleConsultSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      const response = await fetch('http://localhost:3002/api/child-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consultForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit child request');
      }
      setFormSuccess('Child request submitted successfully! An admin will review your request.');
      setConsultForm({ childName: '', password: '', phoneNumber: '', therapistNumber: '', adminName: '' });
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Handle admin form input changes
  const handleAdminInputChange = (e) => {
    const { name, value } = e.target;
    setAdminForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle admin form submission
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      const response = await fetch('http://localhost:3002/api/admin-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit admin request');
      }
      setFormSuccess('Admin request submitted successfully! A super admin will review your request.');
      setAdminForm({ name: '', password: '', phoneNumber: '', occupation: '', bio: '' });
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Add event listener for clicks outside modal
  useEffect(() => {
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <div className="landing-page-wrapper">
      <header className="header">
        <div className="container">
          <h1>Joyverse</h1>
          <nav className="nav">
            <button onClick={() => navigate('/login')}>Login</button>
          </nav>
        </div>
      </header>

      {/* Login Modal */}
      <div
        id="loginModal"
        className="modal"
        style={{ display: activeModal === 'loginModal' ? 'flex' : 'none' }}
      >
        <div className="modal-content">
          <h3>Login</h3>
          <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email" required aria-label="Email" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              aria-label="Password"
            />
            <button type="submit">Login</button>
            <button type="button" className="close-btn" onClick={closeModal}>
              Close
            </button>
          </form>
        </div>
      </div>

      {/* Consult Modal */}
      <div
        id="consultModal"
        className="modal"
        style={{ display: activeModal === 'consultModal' ? 'flex' : 'none' }}
      >
        <div className="modal-content">
          <h3>Request Child Account</h3>
          {formSuccess && <p className="success">{formSuccess}</p>}
          {formError && <p className="error">{formError}</p>}
          <form onSubmit={handleConsultSubmit}>
            <input
              type="text"
              name="childName"
              placeholder="Child's Name"
              value={consultForm.childName}
              onChange={handleConsultInputChange}
              required
              aria-label="Child's Name"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={consultForm.password}
              onChange={handleConsultInputChange}
              required
              aria-label="Password"
            />
            <input
              type="tel"
              name="phoneNumber"
              placeholder="Phone Number"
              value={consultForm.phoneNumber}
              onChange={handleConsultInputChange}
              required
              aria-label="Phone Number"
            />
            <input
              type="text"
              name="therapistNumber"
              id="therapistNumber"
              placeholder="Admin Number"
              value={consultForm.therapistNumber}
              onChange={handleConsultInputChange}
              required
              aria-label="Admin Number"
              readOnly
            />
            <input
              type="text"
              name="adminName"
              placeholder="Admin Name"
              value={consultForm.adminName}
              onChange={handleConsultInputChange}
              required
              aria-label="Admin Name"
              readOnly
            />
            <button type="submit">Submit</button>
            <button type="button" className="close-btn" onClick={closeModal}>
              Close
            </button>
          </form>
        </div>
      </div>

      {/* Become an Admin Modal */}
      <div
        id="adminModal"
        className="modal"
        style={{ display: activeModal === 'adminModal' ? 'flex' : 'none' }}
      >
        <div className="modal-content">
          <h3>Request Admin Account</h3>
          {formSuccess && <p className="success">{formSuccess}</p>}
          {formError && <p className="error">{formError}</p>}
          <form onSubmit={handleAdminSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={adminForm.name}
              onChange={handleAdminInputChange}
              required
              aria-label="Full Name"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={adminForm.password}
              onChange={handleAdminInputChange}
              required
              aria-label="Password"
            />
            <input
              type="tel"
              name="phoneNumber"
              placeholder="Phone Number"
              value={adminForm.phoneNumber}
              onChange={handleAdminInputChange}
              required
              aria-label="Phone Number"
            />
            <input
              type="text"
              name="occupation"
              placeholder="Occupation"
              value={adminForm.occupation}
              onChange={handleAdminInputChange}
              aria-label="Occupation"
            />
            <textarea
              name="bio"
              placeholder="Bio"
              value={adminForm.bio}
              onChange={handleAdminInputChange}
              aria-label="Bio"
              rows="4"
            ></textarea>
            <button type="submit">Submit</button>
            <button type="button" className="close-btn" onClick={closeModal}>
              Close
            </button>
          </form>
        </div>
      </div>

      <section className="hero section">
        <div className="container">
          <h2>Empowering Dyslexic Children with Joyverse</h2>
          <p>
            Joyverse uses fun games and emotion analysis to support dyslexic
            children, connecting them with expert admins.
          </p>
          <a href="#admins" className="btn">
            Get Started
          </a>
        </div>
      </section>

      <section id="about" className="section">
        <div className="container">
          <h3>Our Mission</h3>
          <p className="centered-text">
            At Joyverse, we believe every child deserves to thrive. Our platform
            combines engaging games with emotion analysis to help dyslexic
            children learn and grow, while providing admins with insights for
            personalized support.
          </p>
        </div>
      </section>

      <section id="test" className="section section-bg">
        <div className="container">
          <h3>Simple At-Home Dyslexia Test</h3>
          <p className="centered-text-with-margin">
            Follow these steps to identify potential dyslexia signs at home. These
            are not a diagnosis but can guide your next steps.
          </p>
          <ul className="test-steps">
            <li>
              <strong>Step 1: Rhyming Words</strong> - Ask your child to rhyme
              words (e.g., cat, hat). Difficulty may indicate dyslexia.
            </li>
            <li>
              <strong>Step 2: Letter Recognition</strong> - Show simple letters
              and ask their names. Struggling with recognition is a sign.
            </li>
            <li>
              <strong>Step 3: Sentence Repetition</strong> - Read a short
              sentence and ask them to repeat it. Note any challenges.
            </li>
          </ul>
          <div className="video-container">
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/zafiGBrFkRM?si=1d4NflkaTlVbyXUM"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
          <p className="text-center margin-top">
            <a href="/assets/Dyslexia-Screening-Test.pdf" className="btn" download>
              Download Dyslexia Test PDF
            </a>
          </p>
          <p className="text-center small-text">
            Always consult a professional for a formal diagnosis.
          </p>
        </div>
      </section>

      <section id="admins" className="section">
        <div className="container">
          <h3>Our Admins</h3>
          {loading ? (
            <p>Loading admins...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : !showProfile ? (
            <div id="admin-carousel" className="carousel-container">
              <button
                className="carousel-arrow left"
                onClick={() => navigateCarousel(-1)}
                aria-label="Previous admin"
              >
                ‹
              </button>
              <div className="carousel">
                {admins.map((admin, index) => (
                  <div
                    key={index}
                    className="carousel-item"
                    onClick={() => handleShowProfile(index)}
                    aria-label={`View ${admin.name}'s profile`}
                  >
                    <div className="avatar">{admin.initial}</div>
                    <h4>{admin.name}</h4>
                    <p>Occupation: {admin.occupation}</p>
                    <p>Phone: {admin.phone}</p>
                    <p>Bio: {admin.bio}</p>
                    <button
                      className="consult-btn"
                      onClick={(e) => handleConsultClick(admin.phone, admin.name, e)}
                      aria-label={`Request child account with ${admin.name}`}
                    >
                      Request Child Account
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="carousel-arrow right"
                onClick={() => navigateCarousel(1)}
                aria-label="Next admin"
              >
                ›
              </button>
            </div>
          ) : (
            <div className="therapist-profile-wrapper" onClick={(e) => {
              if (e.target.classList.contains('therapist-profile-wrapper')) {
                handleShowCarousel();
              }
            }}>
              <div className="therapist-profile" style={{ display: 'block' }}>
                {selectedAdmin && (
                  <>
                    <h4>Basic Information</h4>
                    <div className="info">
                      <div className="avatar">{selectedAdmin.initial}</div>
                      <div className="details">
                        <h5>{selectedAdmin.name}</h5>
                        <ul>
                          <li>Occupation: {selectedAdmin.occupation}</li>
                          <li>Phone: {selectedAdmin.phone}</li>
                          <li>Age: {selectedAdmin.age || 'Not specified'}</li>
                          <li>Location: {selectedAdmin.location}</li>
                        </ul>
                      </div>
                    </div>
                    <div className="bio">
                      <strong>Bio</strong>
                      <p>{selectedAdmin.bio}</p>
                    </div>
                    <div className="consult-btn-container">
                      <button
                        className="consult-btn"
                        onClick={(e) => handleConsultClick(selectedAdmin.phone, selectedAdmin.name, e)}
                        aria-label={`Request child account with ${selectedAdmin.name}`}
                      >
                        Request Child Account
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="text-center" style={{ marginTop: '1rem' }}>
            <button
              className="btn"
              onClick={() => openModal('adminModal')}
              aria-label="Request Admin Account"
            >
              Request Admin Account
            </button>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="container">
          <h3>How Joyverse Works</h3>
          <div className="how-it-works">
            <div>
              <h4>1. Play Games</h4>
              <p>Children enjoy fun, dyslexia-friendly games.</p>
            </div>
            <div>
              <h4>2. Analyze Emotions</h4>
              <p>Our system tracks emotions during gameplay.</p>
            </div>
            <div>
              <h4>3. Admin Support</h4>
              <p>Admins receive data for personalized guidance.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-bg" id="testimonials">
        <div className="container">
          <h3>What Parents Say</h3>
          <p className="testimonial">
            "Joyverse made learning fun for my child, and the admin's advice
            was a game-changer!"
          </p>
          <p className="text-center small-text">— Anonymous Parent</p>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="container">
          <h3>Frequently Asked Questions</h3>
          <details className="details">
            <summary>Is Joyverse safe for my child?</summary>
            <p>
              We prioritize safety with secure data handling and age-appropriate
              content.
            </p>
          </details>
          <details className="details">
            <summary>How is data protected?</summary>
            <p>All data is encrypted and complies with privacy standards.</p>
          </details>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>
            <button
              id="contactBtn"
              className="btn"
              onClick={() => openModal('consultModal')}
            >
              Contact Us
            </button>
          </p>
          <p style={{ margin: '0.5rem 0' }}>
            <a href="#privacy">Privacy Policy</a> |{' '}
            <a href="#terms">Terms of Service</a>
          </p>
          <p>
            Follow us: <a href="#social">Twitter</a> |{' '}
            <a href="#social">Facebook</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;