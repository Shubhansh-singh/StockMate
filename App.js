
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

export default function App() {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [barcode, setBarcode] = useState('');
  const [apiProduct, setApiProduct] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Load saved inventory
  useEffect(() => {
    async function loadItems() {
      try {
        const savedItems = await AsyncStorage.getItem('stockItems');

        if (savedItems !== null) {
          setItems(JSON.parse(savedItems));
        }
      } catch (error) {
        console.log('Error loading inventory:', error);
      } finally {
        setLoaded(true);
      }
    }

    loadItems();
  }, []);

  // Save inventory whenever it changes
  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem('stockItems', JSON.stringify(items))
      .catch(error => console.log('Error saving inventory:', error));
  }, [items, loaded]);

  // Add stock
  function addItem() {
    const amount = Number(quantity);

    if (
      !name.trim() ||
      !quantity.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      Alert.alert(
        'Invalid input',
        'Enter a product name and a quantity greater than zero.'
      );
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: name.trim(),
      quantity: amount,
    };

    setItems(currentItems => [...currentItems, newItem]);
    setName('');
    setQuantity('');
  }

  // Reduce stock by one
  function useStock(id) {
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(0, item.quantity - 1),
            }
          : item
      )
    );
  }

  // Fetch product details from the API
  async function fetchProductForBarcode(code) {
    setApiLoading(true);
    setApiProduct(null);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`
      );

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      if (data.status === 1 && data.product) {
        setApiProduct({
          name: data.product.product_name || 'Unknown product',
          barcode: code,
        });
      } else {
        Alert.alert(
          'Product not found',
          'No product was found for this barcode.'
        );
      }
    } catch (error) {
      Alert.alert(
        'API Error',
        'Could not fetch product information. Check your internet connection.'
      );
    } finally {
      setApiLoading(false);
    }
  }

  // Fetch using the manually entered barcode
  function fetchProduct() {
    const code = barcode.trim();

    if (!code) {
      Alert.alert('Enter barcode', 'Please enter a barcode.');
      return;
    }

    fetchProductForBarcode(code);
  }

  // Handle barcode scan
  function handleBarcodeScan({ data }) {
    if (scanned) return;

    setScanned(true);
    setScannerOpen(false);
    setBarcode(data);
    fetchProductForBarcode(data);
  }

  // Request camera permission and open scanner
  async function openScanner() {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();

        if (!result.granted) {
          Alert.alert(
            'Camera permission',
            'Allow camera access to scan barcodes.'
          );
          return;
        }
      }

      setScanned(false);
      setScannerOpen(true);
    } catch (error) {
      Alert.alert('Error', 'Unable to open the camera.');
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>StockMate</Text>
      <Text style={styles.subtitle}>Simple Stock Management</Text>

      {scannerOpen && (
        <View style={styles.scanner}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={
              scanned ? undefined : handleBarcodeScan
            }
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
          />

          <Button
            title="Cancel Scan"
            onPress={() => setScannerOpen(false)}
          />
        </View>
      )}

      <Text style={styles.heading}>Add Stock</Text>

      <TextInput
        style={styles.input}
        placeholder="Product name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />

      <Button title="Add Stock" onPress={addItem} />

      <Text style={styles.heading}>Find Food Product</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter barcode"
        value={barcode}
        onChangeText={setBarcode}
        keyboardType="numeric"
      />

      <View style={styles.buttonSpace}>
        <Button
          title={apiLoading ? 'Searching...' : 'Fetch Product'}
          onPress={fetchProduct}
          disabled={apiLoading}
        />
      </View>

      <Button title="Scan Barcode" onPress={openScanner} />

      {apiProduct && (
        <View style={styles.card}>
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>
              {apiProduct.name}
            </Text>
            <Text>Barcode: {apiProduct.barcode}</Text>
          </View>

          <Button
            title="Use Name"
            onPress={() => setName(apiProduct.name)}
          />
        </View>
      )}

      <Text style={styles.heading}>Inventory</Text>

      {!loaded ? (
        <Text>Loading inventory...</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text>No items added yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>
                  {item.name}
                </Text>
                <Text>Quantity: {item.quantity}</Text>
              </View>

              <Button
                title="Use 1"
                onPress={() => useStock(item.id)}
                disabled={item.quantity <= 0}
              />
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f2f5f9',
  },
  container: {
    padding: 20,
    paddingTop: 65,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#333',
  },
  heading: {
    fontSize: 21,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  buttonSpace: {
    marginBottom: 10,
  },
  scanner: {
    height: 350,
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 10,
  },
  camera: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginTop: 12,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
