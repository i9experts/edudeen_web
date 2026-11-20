import { Navigate, useParams } from 'react-router-dom';
import { COURSE_STEP_INDEX } from './ProductWizard';

/**
 * The course builder is now step 6 of the product wizard. Old links (product list, product detail, bookmarks,
 * the students page) still point at /products/:id/course, so they land on that step.
 */
export default function CourseBuilderRedirect() {
  const { storeId = '', productId = '' } = useParams();
  return <Navigate to={`/store/${storeId}/products/edit/${productId}?step=${COURSE_STEP_INDEX}`} replace />;
}
