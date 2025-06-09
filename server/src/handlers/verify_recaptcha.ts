
export const verifyRecaptcha = async (token: string): Promise<boolean> => {
  try {
    const secretKey = process.env['RECAPTCHA_SECRET_KEY'];
    
    if (!secretKey) {
      console.error('reCAPTCHA secret key not configured');
      return false;
    }

    if (!token || token.trim() === '') {
      console.error('reCAPTCHA token is empty or missing');
      return false;
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error('reCAPTCHA verification request failed:', response.status);
      return false;
    }

    const data = await response.json() as { success: boolean };
    
    // Google reCAPTCHA returns { success: true/false, ... }
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error);
    return false;
  }
};
