export type Locale = "en" | "ar";

type QuizQuestion = {
  id: string;
  title: string;
  subtitle: string;
  options: { value: string; label: string; helper?: string }[];
};

type TranslationMap = {
  common: {
    login: string;
    register: string;
    joinOlfa: string;
    createAccount: string;
    backToHome: string;
    back: string;
    save: string;
    next: string;
    submit: string;
    loading: string;
    error: string;
    sessionExpired: string;
    male: string;
    female: string;
    fullName: string;
    email: string;
    password: string;
    gender: string;
  };
  home: {
    heroLabel: string;
    heroTitle: string;
    heroSubtitle: string;
    heroDescription: string;
    identityTitle: string;
    identityDesc: string;
    quizTitle: string;
    quizDesc: string;
    moderationTitle: string;
    moderationDesc: string;
    joinCta: string;
    loginCta: string;
    footer: string;
  };
    register: {
      title: string;
      subtitle: string;
      subtitleTail: string;
      roleNotice: string;
      agreeNotice: string;
      createAccount: string;
      creating: string;
      fillRequired: string;
      failed: string;
      unexpectedError: string;
      genderHint: string;
      initialRoleTitle: string;
      successMessage: string;
    };
    login: {
      title: string;
      subtitle: string;
      signingIn: string;
      checkingAccess: string;
      redirecting: string;
      noProfile: string;
      enterEmailPassword: string;
      failed: string;
      somethingWrong: string;
    };
  quiz: {
    stepLabel: string;
    title: string;
      description: string;
      questionLabel: string;
      answerAll: string;
    saveAndContinue: string;
    saving: string;
    success: string;
    privacyNote: string;
    questions: QuizQuestion[];
  };
  verify: {
    stepLabel: string;
    title: string;
    description: string;
    front: string;
    right: string;
    left: string;
    frontInstruction: string;
    frontHint: string;
    rightInstruction: string;
    rightHint: string;
    leftInstruction: string;
    leftHint: string;
    capture: string;
    retake: string;
    nextAngle: string;
    previewTitle: string;
    previewDesc: string;
    deviceNote: string;
    deviceStatus: string;
    deviceCaptured: string;
    deviceFailed: string;
    deviceProtection: string;
    capturingFingerprint: string;
    submitPhotos: string;
    submitting: string;
    reviewNote: string;
    preparing: string;
    cameraNotReady: string;
    unableToCapture: string;
    captureBeforeContinue: string;
    completeAllPhotos: string;
    submitError: string;
    sessionExpired: string;
    couldNotLoadProfile: string;
    pending: string;
    dropHere: string;
    orChooseFile: string;
  };
  success: {
    label: string;
    title: string;
    body: string;
    backHome: string;
  };
  pendingVerification: {
    title: string;
    body: string;
    contactSupport: string;
    backToHome: string;
  };
  support: {
    title: string;
    body: string;
  };
  deviceBlocked: {
    title: string;
    body: string;
    signOut: string;
  };
  pledge: {
    title: string;
    agreeButton: string;
    loading: string;
  };
  social: {
    stepLabel: string;
    title: string;
    disclaimer: string;
    facebookLabel: string;
    linkedinLabel: string;
    skip: string;
    continue: string;
    saving: string;
    optional: string;
  };
  profile: {
    title: string;
    subtitle: string;
    save: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    fullName: string;
    gender: string;
    male: string;
    female: string;
    nationality: string;
    age: string;
    maritalStatus: string;
    email: string;
    phoneVerification: string;
    phoneVerifySubtitle: string;
    sendOtp: string;
    simulateOtp: string;
    enterCode: string;
    confirmSimulated: string;
    confirmRealSms: string;
    verified: string;
    markVerified: string;
    appearance: string;
    appearanceSub: string;
    height: string;
    weight: string;
    skinTone: string;
    lifestyle: string;
    lifestyleSub: string;
    smoking: string;
    religiousCommitment: string;
    desireChildren: string;
    career: string;
    careerSub: string;
    jobTitle: string;
    education: string;
    country: string;
    city: string;
    photos: string;
    photosSub: string;
    blurNonMatches: string;
    addPhoto: string;
    primary: string;
    setPrimary: string;
    delete: string;
    personalEssays: string;
    personalEssaysSub: string;
    aboutMe: string;
    idealPartner: string;
    aboutMePlaceholder: string;
    idealPartnerPlaceholder: string;
    editProfile: string;
    viewAsOthersSeeMe: string;
    shareProfile: string;
    linkCopiedSuccess: string;
    saveChanges: string;
    saveAndReturn: string;
    letAiWriteBioNow: string;
    profileStrength: string;
    charismaRating: string;
    communityRating: string;
    rateThisProfile: string;
    rateOnlyAfterInteraction: string;
    completeFieldToBoostStrength: string;
    magicWand: string;
    aiGenerating: string;
    selectOption: string;
    toastSaved: string;
    copied: string;
    toastError: string;
    toastUploadFailed: string;
    toastBucketMissing: string;
    toastPhotoRemoved: string;
    toastPrimaryUpdated: string;
    useSimulatedCode: string;
    aiKeyMissing: string;
    optSingle: string;
    optDivorced: string;
    optWidowed: string;
    optFair: string;
    optMedium: string;
    optOlive: string;
    optBrown: string;
    optDark: string;
    optNever: string;
    optFormer: string;
    optOccasionally: string;
    optYes: string;
    optNo: string;
    optOpen: string;
    optUndecided: string;
    optPracticing: string;
    optModerate: string;
    optRevert: string;
    optSeeking: string;
    optHighSchool: string;
    optBachelors: string;
    optMasters: string;
    optDoctorate: string;
    optOther: string;
    /** Gender-aware option labels (Edit Profile). Use opt{Value}Male / opt{Value}Female when present. */
    optSingleMale?: string;
    optSingleFemale?: string;
    optDivorcedMale?: string;
    optDivorcedFemale?: string;
    optWidowedMale?: string;
    optWidowedFemale?: string;
    optHighSchoolMale?: string;
    optHighSchoolFemale?: string;
    optBachelorsMale?: string;
    optBachelorsFemale?: string;
    optMastersMale?: string;
    optMastersFemale?: string;
    optDoctorateMale?: string;
    optDoctorateFemale?: string;
    optOtherMale?: string;
    optOtherFemale?: string;
    optFairMale?: string;
    optFairFemale?: string;
    optMediumMale?: string;
    optMediumFemale?: string;
    optOliveMale?: string;
    optOliveFemale?: string;
    optBrownMale?: string;
    optBrownFemale?: string;
    optDarkMale?: string;
    optDarkFemale?: string;
    optNeverMale?: string;
    optNeverFemale?: string;
    optFormerMale?: string;
    optFormerFemale?: string;
    optOccasionallyMale?: string;
    optOccasionallyFemale?: string;
    optYesMale?: string;
    optYesFemale?: string;
    optNoMale?: string;
    optNoFemale?: string;
    optOpenMale?: string;
    optOpenFemale?: string;
    optUndecidedMale?: string;
    optUndecidedFemale?: string;
    optPracticingMale?: string;
    optPracticingFemale?: string;
    optModerateMale?: string;
    optModerateFemale?: string;
    optRevertMale?: string;
    optRevertFemale?: string;
    optSeekingMale?: string;
    optSeekingFemale?: string;
  };
  nav: {
    home: string;
    dashboard: string;
    login: string;
    register: string;
    profile: string;
    logout: string;
    language: string;
  };
  discovery: {
    filterAll: string;
    filterMales: string;
    filterFemales: string;
    searchPlaceholder: string;
    sameGenderOnlyMessage: string;
    like: string;
    liked: string;
    chat: string;
    online: string;
    offline: string;
    noUsers: string;
    matchToast: string;
  };
};

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

const translations: Record<Locale, TranslationMap> = {
  en: {
    common: {
      login: "Login",
      register: "Register",
      joinOlfa: "Join Olfa",
      createAccount: "Create an account",
      backToHome: "Back to home",
      back: "Back",
      save: "Save",
      next: "Next",
      submit: "Submit",
      loading: "Loading…",
      error: "Error",
      sessionExpired: "Your session has expired. Please sign in again.",
      male: "Male",
      female: "Female",
      fullName: "Full Name",
      email: "Email",
      password: "Password",
      gender: "Gender",
    },
    home: {
      heroLabel: "Islamic Marriage Platform",
      heroTitle: "Olfa",
      heroSubtitle: "Intentional Islamic Marriage",
      heroDescription:
        "A serious, ad-free space for those seeking a spouse with clarity and respect. Built on safety, identity verification, and Islamic values.",
      identityTitle: "Identity verification",
      identityDesc:
        "Three-angle photo verification and device fingerprinting help keep profiles real and reduce fake or duplicate accounts.",
      quizTitle: "Psychological quiz",
      quizDesc:
        "A short gatekeeper quiz on values, conflict, and lifestyle so matches start from a place of alignment and intention.",
      moderationTitle: "Role-based moderation",
      moderationDesc:
        "Dedicated admins and moderators review verifications and monitor conversations so the community stays safe and serious.",
      joinCta: "Join Olfa",
      loginCta: "Login",
      footer:
        "By joining, you agree to Olfa's values of respect, sincerity, and safety. No ads. No games. Just intention.",
    },
    register: {
      title: "Olfa Registration",
      subtitle: "A focused, intentional Islamic marriage platform.",
      subtitleTail: "Your gender shapes a tailored experience.",
      roleNotice:
        "You will start as a member. Only the platform admin can grant moderator or admin roles from the protected dashboard.",
      agreeNotice:
        "By continuing, you agree to Olfa's ad-free, nikah-oriented environment. We will later ask you to complete a short psychological compatibility quiz and a three-angle photo verification to keep the platform safe and intentional.",
      createAccount: "Create account",
      creating: "Creating your account...",
      fillRequired: "Please fill in all required fields, including gender.",
      failed: "Registration failed. Please try again.",
      unexpectedError: "Unexpected error while registering. Please try again.",
      genderHint: "This only controls your experience and UI styling. It is never shown publicly without your consent.",
      initialRoleTitle: "Initial Role",
      successMessage: "Registration successful. Let's begin your onboarding.",
    },
    login: {
      title: "Log in to Olfa",
      subtitle: "Sign in with your email to continue. We'll take you to the right place based on your account.",
      signingIn: "Signing in…",
      checkingAccess: "Checking access…",
      redirecting: "Redirecting…",
      noProfile: "Could not load or create your profile. Please try again.",
      enterEmailPassword: "Please enter your email and password.",
      failed: "Login failed. Please try again.",
      somethingWrong: "Something went wrong. Please try again.",
    },
    quiz: {
      stepLabel: "Onboarding · Step 1 of 2",
      title: "The Olfa Gatekeeper Quiz",
      description:
        "Five short questions to understand how you move through life, conflict, and responsibility. This helps us keep Olfa intentional, serious, and aligned with Islamic values.",
      questionLabel: "Question",
      answerAll: "Please answer all questions before continuing.",
      saveAndContinue: "Save and continue to photos",
      saving: "Saving...",
      success: "Your answers have been saved. Next, we will guide you through a short photo verification step.",
      privacyNote:
        "Your answers are private and used only to improve matching quality and protect the seriousness of the platform.",
      questions: [
        {
          id: "financial_views",
          title: "How do you view financial responsibility in marriage?",
          subtitle: "Think about provision, saving, and decision-making around money.",
          options: [
            { value: "traditional_provider", label: "One primary provider, shared consultation on big decisions", helper: "Clear roles, but decisions are made together with shura." },
            { value: "shared_contribution", label: "Both can contribute, with agreed responsibilities", helper: "Flexible contribution as long as expectations are clear." },
            { value: "fully_joint", label: "Everything is fully joint with equal say", helper: "No separation of income, all financial choices are shared." },
            { value: "independent_budgets", label: "Largely independent budgets with some shared costs", helper: "More autonomy around money, minimal shared pooling." },
          ],
        },
        {
          id: "social_roles",
          title: "How do you see social and household roles?",
          subtitle: "Consider responsibilities inside and outside the home, informed by deen.",
          options: [
            { value: "clearly_defined_roles", label: "Prefer clearly defined, traditional roles", helper: "Roles are mostly set, with occasional flexibility." },
            { value: "complementary_roles", label: "Complementary roles based on strengths", helper: "You discuss and divide roles according to ability and season." },
            { value: "fully_shared_roles", label: "Most roles are shared and negotiated regularly", helper: "You prefer frequent renegotiation of who does what." },
            { value: "case_by_case", label: "Case-by-case, not attached to specific labels", helper: "You prioritise practicality more than structure." },
          ],
        },
        {
          id: "anger_management",
          title: "How do you typically handle anger and conflict?",
          subtitle: "Be honest about how you react under pressure, not just how you wish to be.",
          options: [
            { value: "cooling_off_first", label: "I prefer to cool off alone, then talk calmly", helper: "You need space before you can resolve issues." },
            { value: "structured_discussion", label: "I like structured, respectful discussion soon after", helper: "You want to resolve things before they linger too long." },
            { value: "avoidant", label: "I tend to avoid conflict and hope it passes", helper: "You may need encouragement to address recurring issues." },
            { value: "expressive_then_regret", label: "I may react strongly, then regret it and apologise", helper: "You are working on emotional regulation and repair." },
          ],
        },
        {
          id: "lifestyle",
          title: "Which lifestyle pace feels most natural to you?",
          subtitle: "Think about daily routine, socialising, work–life balance, and rest.",
          options: [
            { value: "quiet_and_routine", label: "Quiet, predictable, and routine-focused", helper: "You value calm, stability, and familiar rhythms." },
            { value: "balanced", label: "Balanced mix of routine and occasional activity", helper: "You enjoy some socialising but need regular downtime." },
            { value: "very_active", label: "Very active, social, and externally engaged", helper: "You enjoy events, travel, and frequent outings." },
            { value: "highly_ambitious", label: "Highly ambitious, driven, and goal-oriented", helper: "You prioritise projects and growth, sometimes over rest." },
          ],
        },
        {
          id: "interests",
          title: "What kind of shared interests matter most to you?",
          subtitle: "This is about how you prefer to connect and spend time together.",
          options: [
            { value: "spiritual_growth", label: "Spiritual growth and Islamic learning together", helper: "Circles, classes, Qur'an, and mutual reminders are central." },
            { value: "intellectual_and_creative", label: "Intellectual or creative pursuits", helper: "Books, ideas, building things, or creative projects." },
            { value: "experiences", label: "Experiences and activities", helper: "Travel, food, nature, and shared adventures." },
            { value: "home_and_family", label: "Home, family, and close-knit gatherings", helper: "You value a deep, private, family-centred life." },
          ],
        },
      ],
    },
    verify: {
      stepLabel: "Onboarding · Step 2 of 2",
      title: "Three-angle photo verification",
      description:
        "Help us confirm that each profile on Olfa is real and serious. These photos are private and only visible to the moderation team for safety and fraud prevention.",
      front: "Front-facing",
      right: "Right profile",
      left: "Left profile",
      frontInstruction: "Look straight at the camera with a neutral expression.",
      frontHint: "Make sure your full face is visible and well lit.",
      rightInstruction: "Turn your head slightly to your right so your right profile is visible.",
      rightHint: "Keep your face in the frame, showing your right side clearly.",
      leftInstruction: "Turn your head slightly to your left so your left profile is visible.",
      leftHint: "Keep your face in the frame, showing your left side clearly.",
      capture: "Capture this angle",
      retake: "Retake",
      nextAngle: "Continue to next angle",
      previewTitle: "Preview & security",
      previewDesc:
        "Only the Olfa team can see these photos. They are used for identity checks and fraud prevention, never for public display or advertising.",
      deviceNote:
        "We securely record a device fingerprint to reduce fake accounts and repeated abuse. It's not used for cross-site tracking or advertising.",
      deviceStatus: "Status:",
      deviceCaptured: "device fingerprint captured",
      deviceFailed: "could not capture fingerprint, but you can still continue",
      deviceProtection: "Device protection",
      capturingFingerprint: "capturing device fingerprint...",
      submitPhotos: "Submit photos for review",
      submitting: "Submitting photos securely...",
      reviewNote:
        "After submission, your profile will be reviewed by an Olfa moderator. You will not be visible or able to fully use Olfa until basic checks are complete.",
      preparing: "Preparing your verification step...",
      cameraNotReady: "Camera is not ready. Please allow camera access and try again.",
      unableToCapture: "Unable to capture image. Please try again.",
      captureBeforeContinue: "Please capture a photo before continuing.",
      completeAllPhotos: "Please complete all three photos before submitting.",
      submitError: "Unexpected error while submitting verification. Please try again.",
      sessionExpired: "Your session has expired. Please sign in again.",
      couldNotLoadProfile: "Could not load or create your profile.",
      pending: "Pending",
      dropHere: "Drop here",
      orChooseFile: "or choose file",
    },
    success: {
      label: "Onboarding complete",
      title: "Thank you! Your profile is under review.",
      body: "Your answers and photos have been securely submitted to the Olfa team. We will notify you once your profile is reviewed and approved. Until then, parts of the platform will stay limited to protect the community.",
      backHome: "Return to home",
    },
    pendingVerification: {
      title: "Profile under review",
      body: "Your profile has been submitted and is being reviewed by the Olfa team. You will not be able to access Discovery or Dashboard until an admin approves your account. We will notify you once the review is complete. If you have questions, please contact support.",
      contactSupport: "Contact support",
      backToHome: "Back to home",
    },
    support: {
      title: "Support",
      body: "For questions about your account or verification, please contact the Olfa team. We typically respond within 1–2 business days.",
    },
    deviceBlocked: {
      title: "Device restricted",
      body: "This device has been restricted from Olfa. You cannot access the platform from this device. If you believe this is an error, please contact support.",
      signOut: "Sign out",
    },
    pledge: {
      title: "Ethical Pledge",
      agreeButton: "I Agree and Commit",
      loading: "Saving…",
    },
    social: {
      stepLabel: "Step 1 of 2",
      title: "Social profile (optional)",
      disclaimer: "This is for AI interest analysis and social verification only. We will NEVER post anything.",
      facebookLabel: "Facebook profile URL",
      linkedinLabel: "LinkedIn profile URL",
      skip: "Skip for now",
      continue: "Continue",
      saving: "Saving…",
      optional: "Optional",
    },
    profile: {
      title: "Profile",
      subtitle: "Manage your information",
      save: "Save",
      step1: "Identity & Phone",
      step2: "Appearance & Lifestyle",
      step3: "Photos & Privacy",
      step4: "Personal Essays",
      fullName: "Full name",
      gender: "Gender",
      male: "Male",
      female: "Female",
      nationality: "Nationality",
      age: "Age",
      maritalStatus: "Marital status",
      email: "Email",
      phoneVerification: "Phone verification",
      phoneVerifySubtitle: "Verify your number with OTP",
      sendOtp: "Send OTP",
      simulateOtp: "Simulate OTP",
      enterCode: "Enter 6-digit code",
      confirmSimulated: "Confirm (simulated)",
      confirmRealSms: "Confirm (real SMS)",
      verified: "Verified",
      markVerified: "Mark as verified",
      appearance: "Appearance",
      appearanceSub: "Height, weight, skin tone",
      height: "Height (cm)",
      weight: "Weight (kg)",
      skinTone: "Skin tone",
      lifestyle: "Lifestyle",
      lifestyleSub: "Smoking, religious commitment, desire for children",
      smoking: "Smoking",
      religiousCommitment: "Religious commitment",
      desireChildren: "Desire for children",
      career: "Career",
      careerSub: "Job, education, location",
      jobTitle: "Job title",
      education: "Education level",
      country: "Country",
      city: "City",
      photos: "Photos",
      photosSub: "Up to 5 photos",
      blurNonMatches: "Blur for non-matches",
      addPhoto: "Add photo",
      primary: "Primary",
      setPrimary: "Set as primary",
      delete: "Delete",
      personalEssays: "Personal narratives",
      personalEssaysSub: "About you and your ideal partner",
      aboutMe: "About me",
      idealPartner: "Ideal partner",
      aboutMePlaceholder: "Personality, hobbies, what matters to you…",
      idealPartnerPlaceholder: "Describe the partner you are looking for…",
      editProfile: "Edit Profile",
      viewAsOthersSeeMe: "View as others see me",
      shareProfile: "Share Profile",
      linkCopiedSuccess: "Link copied to clipboard.",
      saveChanges: "Save Changes",
      saveAndReturn: "Save & Return",
      letAiWriteBioNow: "Let AI write your bio now",
      profileStrength: "Profile Strength",
      charismaRating: "Charisma Rating",
      communityRating: "Community Rating",
      rateThisProfile: "Rate this profile",
      rateOnlyAfterInteraction: "You can only rate after interacting with this member.",
      completeFieldToBoostStrength: "Complete this field to boost your profile strength!",
      magicWand: "Suggest with AI",
      aiGenerating: "Generating…",
      selectOption: "Select…",
      toastSaved: "Profile saved successfully.",
      copied: "Copied!",
      toastError: "Failed to save profile.",
      toastUploadFailed: "Upload failed.",
      toastBucketMissing: "Photo storage is not set up. Please contact support.",
      toastPhotoRemoved: "Photo removed.",
      toastPrimaryUpdated: "Primary photo updated.",
      useSimulatedCode: "For simulation, use code 123456.",
      aiKeyMissing: "Add GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY in Vercel (Environment Variables) or .env.local for local dev.",
      optSingle: "Single",
      optDivorced: "Divorced",
      optWidowed: "Widowed",
      optFair: "Fair",
      optMedium: "Medium",
      optOlive: "Olive",
      optBrown: "Brown",
      optDark: "Dark",
      optNever: "Never",
      optFormer: "Former",
      optOccasionally: "Occasionally",
      optYes: "Yes",
      optNo: "No",
      optOpen: "Open",
      optUndecided: "Undecided",
      optPracticing: "Practicing",
      optModerate: "Moderate",
      optRevert: "Revert",
      optSeeking: "Seeking to strengthen",
      optHighSchool: "High School",
      optBachelors: "Bachelor's",
      optMasters: "Master's",
      optDoctorate: "Doctorate",
      optOther: "Other",
      optSingleMale: "Single",
      optSingleFemale: "Single",
      optDivorcedMale: "Divorced",
      optDivorcedFemale: "Divorced",
      optWidowedMale: "Widowed",
      optWidowedFemale: "Widowed",
      optHighSchoolMale: "High School",
      optHighSchoolFemale: "High School",
      optBachelorsMale: "Bachelor's",
      optBachelorsFemale: "Bachelor's",
      optMastersMale: "Master's",
      optMastersFemale: "Master's",
      optDoctorateMale: "Doctorate",
      optDoctorateFemale: "Doctorate",
      optOtherMale: "Other",
      optOtherFemale: "Other",
      optFairMale: "Fair",
      optFairFemale: "Fair",
      optMediumMale: "Medium",
      optMediumFemale: "Medium",
      optOliveMale: "Olive",
      optOliveFemale: "Olive",
      optBrownMale: "Brown",
      optBrownFemale: "Brown",
      optDarkMale: "Dark",
      optDarkFemale: "Dark",
      optNeverMale: "Never",
      optNeverFemale: "Never",
      optFormerMale: "Former",
      optFormerFemale: "Former",
      optOccasionallyMale: "Occasionally",
      optOccasionallyFemale: "Occasionally",
      optYesMale: "Yes",
      optYesFemale: "Yes",
      optNoMale: "No",
      optNoFemale: "No",
      optOpenMale: "Open",
      optOpenFemale: "Open",
      optUndecidedMale: "Undecided",
      optUndecidedFemale: "Undecided",
      optPracticingMale: "Practicing",
      optPracticingFemale: "Practicing",
      optModerateMale: "Moderate",
      optModerateFemale: "Moderate",
      optRevertMale: "Revert",
      optRevertFemale: "Revert",
      optSeekingMale: "Seeking to strengthen",
      optSeekingFemale: "Seeking to strengthen",
    },
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      login: "Login",
      register: "Register",
      profile: "Profile",
      logout: "Logout",
      language: "Language",
    },
    discovery: {
      filterAll: "All",
      filterMales: "Males",
      filterFemales: "Females",
      searchPlaceholder: "Search by name or job…",
      sameGenderOnlyMessage: "Communication is only available with the opposite gender.",
      like: "Like",
      liked: "Liked",
      chat: "Chat",
      online: "Online",
      offline: "Offline",
      noUsers: "No other verified users right now.",
      matchToast: "It's a match with {name}! You can chat now.",
    },
  },
  ar: {
    common: {
      login: "تسجيل الدخول",
      register: "إنشاء حساب",
      joinOlfa: "انضم إلى أولفا",
      createAccount: "إنشاء حساب",
      backToHome: "العودة للرئيسية",
      back: "رجوع",
      save: "حفظ",
      next: "التالي",
      submit: "إرسال",
      loading: "جاري التحميل…",
      error: "خطأ",
      sessionExpired: "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.",
      male: "ذكر",
      female: "أنثى",
      fullName: "الاسم الكامل",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      gender: "الجنس",
    },
    home: {
      heroLabel: "منصة الزواج الإسلامي",
      heroTitle: "أولفا",
      heroSubtitle: "زواج إسلامي هادف",
      heroDescription:
        "فضاء جاد وخالٍ من الإعلانات لمن يبحث عن شريك بحذر واحترام. مبني على الأمان والتحقق من الهوية والقيم الإسلامية.",
      identityTitle: "التحقق من الهوية",
      identityDesc:
        "التحقق بثلاث لقطات وصورة بصمة الجهاز يساعدان في الحفاظ على حسابات حقيقية وتقليل الحسابات المزيفة أو المكررة.",
      quizTitle: "استبيان نفسي",
      quizDesc:
        "استبيان قصير عن القيم والخلافات ونمط الحياة لبدء التطابق من انسجام ونية واضحة.",
      moderationTitle: "إشراف حسب الأدوار",
      moderationDesc:
        "مشرفون ومراقبون يراجعون التحققات ويراقبون المحادثات ليظل المجتمع آمناً وجاداً.",
      joinCta: "انضم إلى أولفا",
      loginCta: "تسجيل الدخول",
      footer:
        "بانضمامك، فإنك توافق على قيم أولفا في الاحترام والصدق والأمان. بدون إعلانات. بدون ألعاب. فقط النية.",
    },
    register: {
      title: "التسجيل في أولفا",
      subtitle: "منصة زواج إسلامي هادفة ومتأنية.",
      subtitleTail: "جنسك يحدد تجربة مخصصة لك.",
      roleNotice:
        "ستبدأ كعضو. فقط مدير المنصة يمكنه منح صلاحيات المراقب أو المدير من لوحة التحكم المحمية.",
      agreeNotice:
        "بالمتابعة، فإنك توافق على بيئة أولفا الخالية من الإعلانات والموجهة للنكاح. سنطلب لاحقاً إكمال استبيان توافق نفسي قصير والتحقق بثلاث لقطات للحفاظ على أمان المنصة.",
      createAccount: "إنشاء الحساب",
      creating: "جاري إنشاء حسابك...",
      fillRequired: "يرجى تعبئة جميع الحقول المطلوبة بما فيها الجنس.",
      failed: "فشل التسجيل. يرجى المحاولة مرة أخرى.",
      unexpectedError: "حدث خطأ غير متوقع أثناء التسجيل. يرجى المحاولة مرة أخرى.",
      genderHint: "هذا يتحكم فقط بتجربتك وتنسيق الواجهة. لا يُعرض علناً دون موافقتك.",
      initialRoleTitle: "الدور الافتراضي",
      successMessage: "تم التسجيل بنجاح. لنبدأ انضمامك.",
    },
    login: {
      title: "تسجيل الدخول إلى أولفا",
      subtitle: "سجّل الدخول بريدك للمتابعة. سنوجّهك إلى المكان المناسب حسب حسابك.",
      signingIn: "جاري تسجيل الدخول…",
      checkingAccess: "جاري التحقق من الصلاحية…",
      redirecting: "جاري التوجيه…",
      noProfile: "تعذر تحميل أو إنشاء ملفك. يرجى المحاولة مرة أخرى.",
      enterEmailPassword: "يرجى إدخال بريدك الإلكتروني وكلمة المرور.",
      failed: "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.",
      somethingWrong: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    },
    quiz: {
      stepLabel: "الانضمام · الخطوة ١ من ٢",
      title: "استبيان أولفا التمهيدي",
      description:
        "خمس أسئلة قصيرة لفهم كيفية تعاملك مع الحياة والخلاف والمسؤولية. هذا يساعدنا في الحفاظ على أولفا هادفة وجادة ومتوافقة مع القيم الإسلامية.",
      questionLabel: "السؤال",
      answerAll: "يرجى الإجابة على جميع الأسئلة قبل المتابعة.",
      saveAndContinue: "حفظ والمتابعة للصور",
      saving: "جاري الحفظ...",
      success: "تم حفظ إجاباتك. سنوجّهك خطوة قصيرة للتحقق بالصور.",
      privacyNote: "إجاباتك خاصة وتُستخدم فقط لتحسين جودة التطابق وحماية جدية المنصة.",
      questions: [
        {
          id: "financial_views",
          title: "كيف تنظر إلى المسؤولية المالية في الزواج؟",
          subtitle: "فكّر في النفقة والادخار واتخاذ القرار في الشؤون المالية.",
          options: [
            { value: "traditional_provider", label: "معيل واحد أساسي مع مشورة مشتركة في القرارات الكبرى", helper: "أدوار واضحة مع اتخاذ القرار معاً بالشورى." },
            { value: "shared_contribution", label: "كلا الطرفين يساهمان بمسؤوليات متفق عليها", helper: "مساهمة مرنة طالما التوقعات واضحة." },
            { value: "fully_joint", label: "كل شيء مشترك بمساواة في الرأي", helper: "لا فصل في الدخل، كل الخيارات المالية مشتركة." },
            { value: "independent_budgets", label: "ميزانيات مستقلة إلى حد كبير مع تكاليف مشتركة", helper: "مزيد من الاستقلالية مالياً مع حد أدنى من التجمع." },
          ],
        },
        {
          id: "social_roles",
          title: "كيف ترى الأدوار الاجتماعية والأسرية؟",
          subtitle: "فكّر في المسؤوليات داخل المنزل وخارجه، وفقاً للدين.",
          options: [
            { value: "clearly_defined_roles", label: "أفضل أدواراً تقليدية محددة بوضوح", helper: "أدوار ثابتة في الغالب مع مرونة عرضية." },
            { value: "complementary_roles", label: "أدوار مكملة حسب القدرات", helper: "تتحدثان وتقسمان الأدوار حسب القدرة والمرحلة." },
            { value: "fully_shared_roles", label: "معظم الأدوار مشتركة ومتفاوض عليها بانتظام", helper: "تفضّل إعادة التفاوض المتكررة على من يفعل ماذا." },
            { value: "case_by_case", label: "حسب الحالة، دون التزام بتسميات محددة", helper: "تعطي الأولوية للجدوى العملية أكثر من الهيكل." },
          ],
        },
        {
          id: "anger_management",
          title: "كيف تتعامل عادة مع الغضب والخلاف؟",
          subtitle: "كن صريحاً في كيفية رد فعلك تحت الضغط، وليس فقط كما تتمنى.",
          options: [
            { value: "cooling_off_first", label: "أفضل أن أهدأ وحدي ثم أتحدث بهدوء", helper: "تحتاج مسافة قبل حل المشكلة." },
            { value: "structured_discussion", label: "أفضل نقاشاً منظماً ومحترماً قريباً من الحدث", helper: "تريد حل الأمور قبل أن تتراكم." },
            { value: "avoidant", label: "أميل لتجنب الخلاف وأتمنى أن يمر", helper: "قد تحتاج تشجيعاً لمعالجة المشاكل المتكررة." },
            { value: "expressive_then_regret", label: "قد أتفاعل بقوة ثم أندم وأعتذر", helper: "تعمل على ضبط المشاعر والإصلاح." },
          ],
        },
        {
          id: "lifestyle",
          title: "أي وتيرة حياة تشعرك بأنها طبيعية؟",
          subtitle: "فكّر في الروتين اليومي والاختلاط والتوازن بين العمل والحياة والراحة.",
          options: [
            { value: "quiet_and_routine", label: "هادئة ومنتظمة ومركزة على الروتين", helper: "تقدر الهدوء والاستقرار والإيقاع المألوف." },
            { value: "balanced", label: "مزيج متوازن من الروتين والنشاط العرضي", helper: "تستمتع بالاختلاط لكن تحتاج وقت راحة منتظم." },
            { value: "very_active", label: "نشطة جداً واجتماعية ومنفتحة على الخارج", helper: "تستمتع بالفعاليات والسفر والتنقل المتكرر." },
            { value: "highly_ambitious", label: "طموحة جداً وموجهة نحو الأهداف", helper: "تعطي الأولوية للمشاريع والنمو أحياناً على الراحة." },
          ],
        },
        {
          id: "interests",
          title: "أي نوع من الاهتمامات المشتركة يهمك أكثر؟",
          subtitle: "هذا عن كيفية تفضيلك للتواصل وقضاء الوقت معاً.",
          options: [
            { value: "spiritual_growth", label: "النمو الروحي والتعلم الإسلامي معاً", helper: "الحلقات والدروس والقرآن والمواعظ المشتركة أساسية." },
            { value: "intellectual_and_creative", label: "الميول الفكرية أو الإبداعية", helper: "الكتب والأفكار وبناء المشاريع أو الإبداع." },
            { value: "experiences", label: "التجارب والأنشطة", helper: "السفر والطعام والطبيعة والمغامرات المشتركة." },
            { value: "home_and_family", label: "المنزل والعائلة واللقاءات الحميمة", helper: "تقدر حياة عميقة وخاصة ومركزة على العائلة." },
          ],
        },
      ],
    },
    verify: {
      stepLabel: "الانضمام · الخطوة ٢ من ٢",
      title: "التحقق بثلاث لقطات",
      description:
        "ساعدنا في التأكد من أن كل ملف في أولفا حقيقي وجاد. هذه الصور خاصة ومرئية فقط لفريق الإشراف للأمان ومنع الاحتيال.",
      front: "أمامية",
      right: "الجناح الأيمن",
      left: "الجناح الأيسر",
      frontInstruction: "انظر مباشرة إلى الكاميرا بتعبير محايد.",
      frontHint: "تأكد من ظهور وجهك بالكامل وإضاءة جيدة.",
      rightInstruction: "أدر رأسك قليلاً لليمين حتى يظهر جناحك الأيمن.",
      rightHint: "أبقِ وجهك في الإطار مع إظهار الجانب الأيمن بوضوح.",
      leftInstruction: "أدر رأسك قليلاً لليسار حتى يظهر جناحك الأيسر.",
      leftHint: "أبقِ وجهك في الإطار مع إظهار الجانب الأيسر بوضوح.",
      capture: "التقاط هذه الزاوية",
      retake: "إعادة",
      nextAngle: "المتابعة للزاوية التالية",
      previewTitle: "معاينة وأمان",
      previewDesc:
        "فريق أولفا فقط يرى هذه الصور. تُستخدم للتحقق من الهوية ومنع الاحتيال، وليس للعرض العام أو الإعلان.",
      deviceNote:
        "نسجل بصمة جهاز بشكل آمن لتقليل الحسابات المزيفة وإساءة الاستخدام المتكررة. لا تُستخدم للتتبع أو الإعلان عبر المواقع.",
      deviceStatus: "الحالة:",
      deviceCaptured: "تم التقاط بصمة الجهاز",
      deviceFailed: "لم نتمكن من التقاط البصمة، لكن يمكنك المتابعة",
      deviceProtection: "حماية الجهاز",
      capturingFingerprint: "جاري التقاط بصمة الجهاز...",
      submitPhotos: "إرسال الصور للمراجعة",
      submitting: "جاري رفع الصور بشكل آمن...",
      reviewNote:
        "بعد الإرسال، سيراجع فريق أولفا ملفك. لن تكون ظاهراً أو قادراً على استخدام أولفا بالكامل حتى اكتمال المراجعة الأساسية.",
      preparing: "جاري تجهيز خطوة التحقق...",
      cameraNotReady: "الكاميرا غير جاهزة. يرجى السماح بالوصول والمحاولة مرة أخرى.",
      unableToCapture: "تعذر التقاط الصورة. يرجى المحاولة مرة أخرى.",
      captureBeforeContinue: "يرجى التقاط صورة قبل المتابعة.",
      completeAllPhotos: "يرجى إكمال الصور الثلاث قبل الإرسال.",
      submitError: "حدث خطأ غير متوقع أثناء إرسال التحقق. يرجى المحاولة مرة أخرى.",
      sessionExpired: "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.",
      couldNotLoadProfile: "تعذر تحميل أو إنشاء ملفك.",
      pending: "قيد الانتظار",
      dropHere: "أفلت هنا",
      orChooseFile: "أو اختر ملف",
    },
    success: {
      label: "اكتمال الانضمام",
      title: "شكراً! ملفك قيد المراجعة.",
      body: "تم إرسال إجاباتك وصورك بشكل آمن إلى فريق أولفا. سنخبرك عند مراجعة واعتماد ملفك. حتى ذلك الحين، أجزاء من المنصة ستظل محدودة لحماية المجتمع.",
      backHome: "العودة للرئيسية",
    },
    pendingVerification: {
      title: "الملف قيد المراجعة",
      body: "تم إرسال ملفك وهو قيد المراجعة من فريق أولفا. لن تتمكن من الدخول إلى الاكتشاف أو لوحة التحكم حتى تتم الموافقة على حسابك من الإدارة. سنخبرك عند انتهاء المراجعة. إن كان لديك استفسار، يرجى التواصل مع الدعم.",
      contactSupport: "التواصل مع الدعم",
      backToHome: "العودة للرئيسية",
    },
    support: {
      title: "الدعم",
      body: "للاستفسارات حول حسابك أو التحقق، يرجى التواصل مع فريق أولفا. نرد عادة خلال يوم إلى يومي عمل.",
    },
    deviceBlocked: {
      title: "الجهاز مقيد",
      body: "تم تقييد هذا الجهاز من أولفا. لا يمكنك الوصول إلى المنصة من هذا الجهاز. إن كنت تعتقد أن هذا خطأ، يرجى التواصل مع الدعم.",
      signOut: "تسجيل الخروج",
    },
    pledge: {
      title: "تعهد الجدية",
      agreeButton: "أوافق وألتزم",
      loading: "جاري الحفظ…",
    },
    social: {
      stepLabel: "الخطوة ١ من ٢",
      title: "الملف الاجتماعي (اختياري)",
      disclaimer: "هذا لتحليل الاهتمامات بالذكاء الاصطناعي والتحقق الاجتماعي فقط. لن ننشر أي شيء أبداً.",
      facebookLabel: "رابط فيسبوك",
      linkedinLabel: "رابط لينكد إن",
      skip: "تخطي الآن",
      continue: "متابعة",
      saving: "جاري الحفظ…",
      optional: "اختياري",
    },
    profile: {
      title: "الملف الشخصي",
      subtitle: "إدارة معلوماتك",
      save: "حفظ",
      step1: "الهوية والهاتف",
      step2: "المظهر ونمط الحياة",
      step3: "الصور والخصوصية",
      step4: "النصوص الشخصية",
      fullName: "الاسم الكامل",
      gender: "الجنس",
      male: "ذكر",
      female: "أنثى",
      nationality: "الجنسية",
      age: "العمر",
      maritalStatus: "الحالة الاجتماعية",
      email: "البريد الإلكتروني",
      phoneVerification: "التحقق من الهاتف",
      phoneVerifySubtitle: "التحقق من رقمك بالرمز",
      sendOtp: "إرسال الرمز",
      simulateOtp: "محاكاة الرمز",
      enterCode: "أدخل الرمز (٦ أرقام)",
      confirmSimulated: "تأكيد (محاكاة)",
      confirmRealSms: "تأكيد (رسالة حقيقية)",
      verified: "تم التحقق",
      markVerified: "اعتبارها مُتحققة",
      appearance: "المظهر",
      appearanceSub: "الطول، الوزن، لون البشرة",
      height: "الطول (سم)",
      weight: "الوزن (كغ)",
      skinTone: "لون البشرة",
      lifestyle: "نمط الحياة",
      lifestyleSub: "التدخين، الالتزام الديني، الرغبة في الأطفال",
      smoking: "التدخين",
      religiousCommitment: "الالتزام الديني",
      desireChildren: "الرغبة في الأطفال",
      career: "المهنة",
      careerSub: "العمل، التعليم، الموقع",
      jobTitle: "المسمى الوظيفي",
      education: "المستوى التعليمي",
      country: "البلد",
      city: "المدينة",
      photos: "الصور",
      photosSub: "حتى ٥ صور",
      blurNonMatches: "طمس الصور لغير المتطابقين",
      addPhoto: "إضافة صورة",
      primary: "رئيسية",
      setPrimary: "تعيين كرئيسية",
      delete: "حذف",
      personalEssays: "النصوص الشخصية",
      personalEssaysSub: "عني وشريكي المنشود",
      aboutMe: "عني",
      idealPartner: "شريكي المنشود",
      aboutMePlaceholder: "الشخصية والهوايات وما يهمك…",
      idealPartnerPlaceholder: "صف الشريك الذي تبحث عنه…",
      editProfile: "تعديل البيانات",
      viewAsOthersSeeMe: "عرض الصفحة كما يراها الآخرون",
      shareProfile: "مشاركة الملف الشخصي",
      linkCopiedSuccess: "تم نسخ الرابط بنجاح",
      saveChanges: "حفظ التعديلات",
      saveAndReturn: "حفظ ورجوع",
      letAiWriteBioNow: "دع الذكاء الاصطناعي يكتب سيرتك الآن",
      profileStrength: "قوة ملفك الشخصي",
      charismaRating: "تقييم الكاريزما",
      communityRating: "تقييم الأعضاء",
      rateThisProfile: "قيّم هذا البروفايل",
      rateOnlyAfterInteraction: "يمكنك التقييم فقط بعد التواصل مع العضو",
      completeFieldToBoostStrength: "أكمل هذا الحقل لزيادة قوة بروفايلك!",
      magicWand: "اقتراح بالذكاء الاصطناعي",
      aiGenerating: "جاري الاقتراح…",
      selectOption: "اختر…",
      toastSaved: "تم حفظ الملف بنجاح.",
      copied: "تم النسخ!",
      toastError: "فشل حفظ الملف.",
      toastUploadFailed: "فشل الرفع.",
      toastBucketMissing: "تخزين الصور غير مُعد. يرجى التواصل مع الدعم.",
      toastPhotoRemoved: "تم حذف الصورة.",
      toastPrimaryUpdated: "تم تحديث الصورة الرئيسية.",
      useSimulatedCode: "للمحاكاة، استخدم الرمز 123456.",
      aiKeyMissing: "أضف GEMINI_API_KEY أو NEXT_PUBLIC_GEMINI_API_KEY في Vercel (Environment Variables) أو في .env.local للتطوير المحلي.",
      optSingle: "أعزب/عزباء",
      optDivorced: "مطلق/مطلقة",
      optWidowed: "أرمل/أرملة",
      optFair: "فاتح",
      optMedium: "متوسط",
      optOlive: "زيتوني",
      optBrown: "بني",
      optDark: "غامق",
      optNever: "لا",
      optFormer: "سابقاً",
      optOccasionally: "أحياناً",
      optYes: "نعم",
      optNo: "لا",
      optOpen: "مفتوح",
      optUndecided: "غير محدد",
      optPracticing: "ملتزم",
      optModerate: "معتدل",
      optRevert: "معتنق",
      optSeeking: "أسعى للتقوية",
      optHighSchool: "ثانوي",
      optBachelors: "بكالوريوس",
      optMasters: "ماجستير",
      optDoctorate: "دكتوراه",
      optOther: "أخرى",
      optSingleMale: "أعزب",
      optSingleFemale: "عزباء",
      optDivorcedMale: "مطلق",
      optDivorcedFemale: "مطلقة",
      optWidowedMale: "أرمل",
      optWidowedFemale: "أرملة",
      optHighSchoolMale: "ثانوي",
      optHighSchoolFemale: "ثانوية",
      optBachelorsMale: "خريج بكالوريوس",
      optBachelorsFemale: "خريجة بكالوريوس",
      optMastersMale: "ماجستير",
      optMastersFemale: "ماجستير",
      optDoctorateMale: "دكتوراه",
      optDoctorateFemale: "دكتوراه",
      optOtherMale: "آخر",
      optOtherFemale: "أخرى",
      optFairMale: "فاتح",
      optFairFemale: "فاتحة",
      optMediumMale: "متوسط",
      optMediumFemale: "متوسطة",
      optOliveMale: "زيتوني",
      optOliveFemale: "زيتونية",
      optBrownMale: "بني",
      optBrownFemale: "بنية",
      optDarkMale: "غامق",
      optDarkFemale: "غامقة",
      optNeverMale: "لا",
      optNeverFemale: "لا",
      optFormerMale: "سابقاً",
      optFormerFemale: "سابقاً",
      optOccasionallyMale: "أحياناً",
      optOccasionallyFemale: "أحياناً",
      optYesMale: "نعم",
      optYesFemale: "نعم",
      optNoMale: "لا",
      optNoFemale: "لا",
      optOpenMale: "مفتوح",
      optOpenFemale: "مفتوحة",
      optUndecidedMale: "غير محدد",
      optUndecidedFemale: "غير محددة",
      optPracticingMale: "ملتزم",
      optPracticingFemale: "ملتزمة",
      optModerateMale: "معتدل",
      optModerateFemale: "معتدلة",
      optRevertMale: "معتنق",
      optRevertFemale: "معتنقة",
      optSeekingMale: "أسعى للتقوية",
      optSeekingFemale: "تسعى للتقوية",
    },
    nav: {
      home: "الرئيسية",
      dashboard: "لوحة التحكم",
      login: "تسجيل الدخول",
      register: "إنشاء حساب",
      profile: "الملف الشخصي",
      logout: "تسجيل الخروج",
      language: "اللغة",
    },
    discovery: {
      filterAll: "الكل",
      filterMales: "رجال",
      filterFemales: "نساء",
      searchPlaceholder: "بحث بالاسم أو المهنة…",
      sameGenderOnlyMessage: "التواصل متاح فقط مع الجنس الآخر.",
      like: "إعجاب",
      liked: "تم الإعجاب",
      chat: "محادثة",
      online: "متصل",
      offline: "غير متصل",
      noUsers: "لا يوجد أعضاء آخرون موثقون حالياً.",
      matchToast: "توافق مع {name}! يمكنك المحادثة الآن.",
    },
  },
};

export function getTranslations(locale: Locale): TranslationMap {
  return translations[locale];
}

export function getQuizQuestions(locale: Locale): QuizQuestion[] {
  return translations[locale].quiz.questions;
}

/** Get a nested translation by dot path, e.g. "home.heroTitle" */
export function t(locale: Locale, path: string): string {
  const value = getNested(translations[locale] as unknown as Record<string, unknown>, path);
  return value ?? path;
}

export const LOCALE_STORAGE_KEY = "olfa-locale";
