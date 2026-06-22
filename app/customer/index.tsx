import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, PanResponder } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { RootState } from '../../store';
import { addToCart, removeFromCart } from '../../store/slices/cartSlice';

export default function CustomerDashboard() {
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartState = useSelector((state: RootState) => state.cart);
  
  const [search, setSearch] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>((params.businessId as string) || null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  React.useEffect(() => {
    if (params.businessId) {
      setSelectedBusinessId(params.businessId as string);
    }
  }, [params.businessId]);

  // PanResponder for swipe‑right to go back to home
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (e, gestureState) => {
      const { dx, dy } = gestureState;
      // Detect swipe right or swipe down
      return (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) || Math.abs(dy) > 30;
    },
    onPanResponderRelease: (e, gestureState) => {
      if (gestureState.dx > 50) {
        // Swipe right → back to home (reset selected business)
        setSelectedBusinessId(null);
      } else if (gestureState.dy > 50) {
        // Swipe down → back to home
        setSelectedBusinessId(null);
      }
    },
  });

  // Fetch Public Businesses
  const { data: businessesData, isLoading: businessesLoading } = useQuery({
    queryKey: ['publicBusinesses'],
    queryFn: () => api.get('/businesses/public').then(res => res.data),
  });

  // Fetch Menu for Selected Business
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['publicMenu', selectedBusinessId],
    queryFn: () => api.get(`/customer-orders/menu/${selectedBusinessId}`).then(res => res.data),
    enabled: !!selectedBusinessId,
  });

  const businesses = businessesData?.data || [];
  const filteredBusinesses = businesses.filter((b: any) => 
    (b.name && b.name.toLowerCase().includes(search.toLowerCase())) ||
    (b.district && b.district.toLowerCase().includes(search.toLowerCase()))
  );

  const businessInfoFromList = businesses.find((b: any) => b._id === selectedBusinessId) || {};
  const businessInfo = { ...businessInfoFromList, ...(menuData?.business || {}) };
  const items = menuData?.items || [];
  const categories = ['All', ...Array.from(new Set(items.map((item: any) => item.category)))];
  const filteredItems = items.filter((item: any) => 
    activeCategory === 'All' || item.category === activeCategory
  );
  const totalCartItems = cartState.items.reduce((acc, item) => acc + item.quantity, 0);

  // ====== RENDER RESTAURANTS LIST (HOME) ======
  if (!selectedBusinessId) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Banner with Search */}
        <View style={styles.heroBanner}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Craving something delicious?</Text>
            <Text style={styles.heroSubtitle}>Discover the best food & drinks near you.</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#D4AF37" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for restaurants or cuisines..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="star" size={24} color="#D4AF37" /> Top Restaurants Near You
          </Text>

          {businessesLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#D4AF37" />
            </View>
          ) : filteredBusinesses.length > 0 ? (
            <View style={styles.gridContainer}>
              {filteredBusinesses.map((business: any) => (
                <TouchableOpacity 
                  key={business._id} 
                  style={styles.card}
                  onPress={() => setSelectedBusinessId(business._id)}
                >
                  <View style={styles.imageContainer}>
                    {business.hotelImages && business.hotelImages.length > 0 ? (
                      <Image source={{ uri: business.hotelImages[0] }} style={styles.cardImage} />
                    ) : business.logoUrl ? (
                      <Image source={{ uri: business.logoUrl }} style={styles.cardImage} />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Ionicons name="restaurant" size={40} color="#D4AF37" style={{ opacity: 0.5 }} />
                      </View>
                    )}
                    
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#16A34A" />
                      <Text style={styles.ratingText}>4.5</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{business.name}</Text>
                    
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={14} color="#94A3B8" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {business.address}, {business.district}
                      </Text>
                    </View>

                    <View style={styles.tagsRow}>
                      <View style={styles.tag}><Text style={styles.tagText}>TOP RATED</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>FAST FOOD</Text></View>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={styles.footerLeft}>
                        <Ionicons name="bicycle" size={16} color="#D4AF37" />
                        <Text style={styles.footerText}>Fast Delivery</Text>
                      </View>
                      <View style={styles.orderBtn}>
                        <Text style={styles.orderBtnText}>Order Now</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No restaurants found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // ====== RENDER RESTAURANT MENU (ORDER) ======
  if (menuLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.fixedBackButton} onPress={() => setSelectedBusinessId(null)}>
        <Ionicons name="arrow-back" size={20} color="#1E293B" />
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false} {...panResponder.panHandlers}>
        {/* Header Image */}
        <View style={styles.headerImageContainer}>
          {businessInfo.hotelImages && businessInfo.hotelImages.length > 0 ? (
            <Image source={{ uri: businessInfo.hotelImages[0] }} style={styles.headerImage} />
          ) : businessInfo.logoUrl ? (
            <Image source={{ uri: businessInfo.logoUrl }} style={styles.headerImage} />
          ) : (
            <View style={styles.placeholderHeader}>
              <Ionicons name="restaurant" size={60} color="#D4AF37" style={{ opacity: 0.5 }} />
            </View>
          )}
        </View>

        {/* Business Info */}
        <View style={styles.businessInfo}>
          <Text style={styles.businessName}>{businessInfo.name}</Text>
          <Text style={styles.businessAddress}>{businessInfo.address}, {businessInfo.district}</Text>
          
          {businessInfo.contactPhone && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="call" size={14} color="#64748B" />
              <Text style={{ fontSize: 13, color: '#64748B', marginLeft: 4, fontWeight: '500' }}>
                {businessInfo.contactPhone}
              </Text>
            </View>
          )}

          <View style={[styles.infoRow, { marginTop: 12 }]}>
            <View style={styles.infoRow}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#16A34A" />
                  <Text style={styles.ratingText}>4.5</Text>
                </View>
                <View style={styles.timeBadge}>
                  <Ionicons name="time-outline" size={14} color="#64748B" />
                  <Text style={styles.timeText}>30-40 min</Text>
                </View>
            </View>
          </View>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
          {categories.map((cat: any) => (
            <TouchableOpacity 
              key={cat}
              style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {filteredItems.map((item: any) => {
            const cartItem = cartState.items.find(i => i.item._id === item._id);
            const quantity = cartItem ? cartItem.quantity : 0;

            return (
              <View key={item._id} style={styles.menuItem}>
                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <Ionicons 
                      name="ellipse" 
                      size={12} 
                      color={item.isVeg ? "#16A34A" : "#EF4444"} 
                      style={{ marginRight: 6 }} 
                    />
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  {item.description && <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>}
                </View>

                <View style={styles.itemRight}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemPlaceholder}>
                      <Ionicons name="fast-food" size={24} color="#CBD5E1" />
                    </View>
                  )}
                  
                  <View style={styles.actionContainer}>
                    {quantity > 0 ? (
                      <View style={styles.quantityControl}>
                        <TouchableOpacity 
                          style={styles.qtyBtn}
                          onPress={() => dispatch(removeFromCart({ itemId: item._id }))}
                        >
                          <Ionicons name="remove" size={16} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{quantity}</Text>
                        <TouchableOpacity 
                          style={styles.qtyBtn}
                          onPress={() => dispatch(addToCart({ businessId: businessInfo._id, businessName: businessInfo.name, item }))}
                        >
                          <Ionicons name="add" size={16} color="#1E293B" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.addButton}
                        onPress={() => dispatch(addToCart({ businessId: businessInfo._id, businessName: businessInfo.name, item }))}
                      >
                        <Text style={styles.addButtonText}>ADD</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>


      </ScrollView>

      {/* Floating Cart Widget */}
      {totalCartItems > 0 && cartState.businessId === businessInfo._id && (
        <View style={styles.cartWidgetWrapper}>
          <TouchableOpacity style={styles.cartWidget} onPress={() => router.push('/customer/checkout')}>
            <View style={styles.cartLeft}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalCartItems}</Text>
              </View>
              <Text style={styles.cartTitle}>View Cart</Text>
            </View>
            <View style={styles.cartRight}>
              <Text style={styles.cartTotal}>Proceed</Text>
              <Ionicons name="chevron-forward" size={20} color="#000000" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroBanner: {
    backgroundColor: '#1E293B',
    padding: 24,
    paddingTop: 32,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D4AF37',
    opacity: 0.1,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  contentSection: {
    padding: 20,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 20,
  },
  loader: {
    padding: 40,
    alignItems: 'center',
  },
  gridContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    height: 180,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF9C3',
  },
  ratingBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E293B',
    marginLeft: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 4,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  orderBtn: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D4AF37',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 12,
  },
  headerImageContainer: {
    height: 220,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderHeader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF9C3',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 40,
    height: 40,
    backgroundColor: 'transparent', // Removed white background
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  fixedBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  businessInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  businessName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  categoryScroll: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D4AF37',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryTextActive: {
    color: '#D4AF37',
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100, // padding for floating cart
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  itemDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  itemRight: {
    width: 110,
    alignItems: 'center',
  },
  itemImage: {
    width: 110,
    height: 110,
    borderRadius: 16,
  },
  itemPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContainer: {
    marginTop: -16,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    width: 90,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16A34A',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  qtyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    width: 24,
    textAlign: 'center',
  },
  cartWidgetWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  cartWidget: {
    backgroundColor: '#D4AF37',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadge: {
    backgroundColor: '#000000',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  cartRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartTotal: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 4,
  },
  cartSummaryBox: {
    backgroundColor: '#FFF7E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cartSummaryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartItemName: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cartItemQty: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginHorizontal: 4,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
});