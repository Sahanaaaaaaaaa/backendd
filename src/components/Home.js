import React from 'react';

const Home = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Roboto, sans-serif' }}>
      {/* Welcome Section */}
      <section style={sectionStyle}>
        <div style={textLeftStyle}>
          <h1 style={headerStyle}>Welcome to VeryCert!</h1>
          <p style={paragraphStyle}>
            Your comprehensive certificate manager that ensures security and efficiency in handling your digital certificates.
          </p>
        </div>
        <div style={imageRightStyle}>
          <img src="admin-dashboard\public\welcome-graphic.png" alt="Welcome Graphic" style={imageProps} />
        </div>
      </section>

      {/* Features Section */}
      <section style={sectionStyle}>
        <div style={imageLeftStyle}>
          <img src="features-graphic.png" alt="Features Graphic" style={imageProps} />
        </div>
        <div style={textRightStyle}>
          <h2 style={headerStyle}>Why VeryCert?</h2>
          <ul style={listStyle}>
            <li>Feature 1: Easy to manage certificates</li>
            <li>Feature 2: High security standards</li>
            <li>Feature 3: User-friendly interface</li>
            <li>Feature 4: Automated renewal notifications</li>
            <li>Feature 5: Detailed analytics and reporting</li>
          </ul>
        </div>
      </section>

      {/* Additional Section */}
      <section style={sectionStyle}>
        <div style={textLeftStyle}>
          <h2 style={headerStyle}>Get Started with VeryCert</h2>
          <p style={paragraphStyle}>
            Join us today and take control of your digital certificates with ease and confidence.
          </p>
        </div>
        <div style={imageRightStyle}>
          <img src="get-started-graphic.png" alt="Get Started Graphic" style={imageProps} />
        </div>
      </section>
    </div>
  );
};

const sectionStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: '40px 0',
  flexWrap: 'wrap',
};

const textLeftStyle = {
  flex: '1 1 50%',
  padding: '20px',
  order: 1,
};

const textRightStyle = {
  flex: '1 1 50%',
  padding: '20px',
  order: 2,
};

const imageLeftStyle = {
  flex: '1 1 50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  order: 2,
};

const imageRightStyle = {
  flex: '1 1 50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  order: 1,
};

const imageProps = {
  maxWidth: '100%',
  height: 'auto',
};

const headerStyle = {
  fontSize: '2.5rem',
  color: '#800080',
  marginBottom: '20px',
};

const paragraphStyle = {
  fontSize: '1.2rem',
  lineHeight: '1.6',
};

const listStyle = {
  fontSize: '1.2rem',
  lineHeight: '1.8',
};

export default Home;
