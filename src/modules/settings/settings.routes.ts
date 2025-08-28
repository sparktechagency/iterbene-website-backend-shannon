import { Router } from 'express';
import { AboutUsController } from './aboutUs/aboutUs.controllers';
import { PrivacyPolicyController } from './privacyPolicy/privacyPolicy.controllers';
import { TermsConditionsController } from './termsConditions/termsConditions.controllers';
import { fullAuth } from '../../middlewares/smartAuth';

const router = Router();
router
  .route('/about-us')
  .get(AboutUsController.getAboutUs)
  .post(fullAuth('admin'), AboutUsController.createOrUpdateAboutUs);

router
  .route('/privacy-policy')
  .get(PrivacyPolicyController.getPrivacyPolicy)
  .post(fullAuth('admin'), PrivacyPolicyController.createOrUpdatePrivacyPolicy);
router
  .route('/terms-conditions')
  .get(TermsConditionsController.getTermsConditions)
  .post(fullAuth('admin'), TermsConditionsController.createOrUpdateTermsConditions);

export const SettingsRoutes = router;
