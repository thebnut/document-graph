/**
 * Node Icon Mapper
 *
 * Maps node data to appropriate Lucide React icons
 */

import React from 'react';
import {
  User,
  Home,
  Car,
  FileText,
  Trees,
  CreditCard,
  Heart,
  Shield,
  Plane,
  Briefcase,
  FolderOpen,
  Calendar,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Folder,
  Baby,
  HeartPulse,
  Banknote,
  IdCard,
  Hospital,
  Sparkles,
} from 'lucide-react';
import type { NodeData } from '../services/dataService-adapter';

export function getNodeIcon(data: NodeData, iconClass: string = 'w-6 h-6'): React.JSX.Element {
  // Special icon for family root node
  if (data.level === 0) {
    return <Trees className={iconClass} />;
  }

  // Handle folders first
  if (data.type === 'folder') {
    switch (data.subtype) {
      case 'identity':
        return <IdCard className={iconClass} />;
      case 'health':
        return <HeartPulse className={iconClass} />;
      case 'financial':
        return <Banknote className={iconClass} />;
      default:
        return <Folder className={iconClass} />;
    }
  }

  // Handle specific document categories
  if (data.category) {
    switch (data.category) {
      case 'passport':
        return <Plane className={iconClass} />;
      case 'drivers-licence':
        return <Car className={iconClass} />;
      case 'birth-certificate':
        return <Baby className={iconClass} />;
      case 'visa':
        return <Plane className={iconClass} />;
      case 'medicare':
      case 'private-health-insurance':
        return <Heart className={iconClass} />;
      case 'car-insurance':
      case 'insurance':
        return <Shield className={iconClass} />;
      case 'bank-accounts':
      case 'credit-cards':
      case 'superannuation':
        return <DollarSign className={iconClass} />;
      case 'gp':
      case 'hospital-visits':
      case 'imaging-reports':
        return <Hospital className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  }

  // More specific icons based on label content
  const labelLower = data.label.toLowerCase();

  // Check for specific document types
  if (labelLower.includes('cleaner')) return <Sparkles className={iconClass} />;
  if (labelLower.includes('gardener')) return <Trees className={iconClass} />;
  if (labelLower.includes('medicare')) return <CreditCard className={iconClass} />;
  if (labelLower.includes('document')) return <FolderOpen className={iconClass} />;
  if (labelLower.includes('email')) return <Mail className={iconClass} />;
  if (labelLower.includes('phone')) return <Phone className={iconClass} />;
  if (labelLower.includes('address')) return <MapPin className={iconClass} />;
  if (labelLower.includes('work') || labelLower.includes('employment'))
    return <Briefcase className={iconClass} />;
  if (labelLower.includes('calendar') || labelLower.includes('schedule'))
    return <Calendar className={iconClass} />;

  // Default icons by type
  switch (data.type) {
    case 'person':
    case 'pet':
      return <User className={iconClass} />;
    case 'asset':
      return data.subtype === 'vehicle' ? <Car className={iconClass} /> : <Home className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}
