import { Router } from 'express';
import { AboutUsController } from './aboutUs/aboutUs.controllers';
import { PrivacyPolicyController } from './privacyPolicy/privacyPolicy.controllers';
import { TermsConditionsController } from './termsConditions/termsConditions.controllers';
import auth from '../../middlewares/auth';

const router = Router();
router
  .route('/about-us')
  .get(AboutUsController.getAboutUs)
  .post(auth('Admin'), AboutUsController.createOrUpdateAboutUs);

router
  .route('/privacy-policy')
  .get(PrivacyPolicyController.getPrivacyPolicy)
  .post(auth('Admin'), PrivacyPolicyController.createOrUpdatePrivacyPolicy);
router
  .route('/terms-conditions')
  .get(TermsConditionsController.getTermsConditions)
  .post(auth('Admin'), TermsConditionsController.createOrUpdateTermsConditions);

export const SettingsRoutes = router;
