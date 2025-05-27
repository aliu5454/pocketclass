import * as Yup from 'yup';

export const classSchema = Yup.object().shape({
  className: Yup.string()
    .required('Class Name is required'),

  category: Yup.string()
    .required('Category is required')
    .oneOf(
      ['Sport', 'Art', 'Music'],
      'Invalid category'
    ),

  sub_category: Yup.string()
    .required('Sub Category is required'),

  mode_of_class: Yup.string()
    .required('Mode of class is required')
    .oneOf(['In Person', 'Online'], 'Invalid mode of class'),

  description: Yup.string()
    .required('Description is required'),

  price: Yup.number()
    .required('Price must be a single amount')
    .positive('Price per class must be a positive number'),

  Pricing: Yup.string()
    .required('Price Description is required'),

  groupSize: Yup.number()
    .required('Max group size is required')
    .positive('Max group size must be a positive number'),

  groupPrice: Yup.number()
    .required('Group price per person is required')
    .positive('Group price per person must be a positive number'),

  experience: Yup.string()
    .required('Experience is required'),

  about: Yup.string()
    .required('About is required'),

  funfact: Yup.string()
    .required('Fun Fact is required'),

  name: Yup.string()
    .required('Name is required'),

  numberOfSessions: Yup.number()
    .required('Number of sessions is required')
    .positive('Number of sessions must be a positive number'),

  priceOfCompleteCourse: Yup.number()
    .required('Price of complete course is required')
    .positive('Price of complete course must be a positive number'),

  discount: Yup.number()
    .required('Discount is required')
    .positive('Discount must be a positive number'),
});
