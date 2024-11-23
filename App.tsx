//IM-2021-119 M.Sujikaran

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Alert, TouchableWithoutFeedback, Dimensions } from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

type HistoryItem = {
  id: number;
  expression: string;
  result: string;
};

const db = SQLite.openDatabase(
  {
    name: 'calculator_history.db',
    location: 'default',
  },
  () => console.log('Database opened successfully'),
  (error: any) => console.error('Error opening database:', error)
);

export default function App() {
  const [displayText, setDisplayText] = useState<string>('0');
  const [currentExpression, setCurrentExpression] = useState<string>('0');
  const [lastValidResult, setLastValidResult] = useState<string>('');
  const [isFinalResultDisplayed, setIsFinalResultDisplayed] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const operators = ['+', '-', '*', '÷'];
  const maxSegmentLength = 16;

  const createTable = () => {
    db.transaction((tx) => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS calculation_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          expression TEXT NOT NULL,
          result TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        [],
        () => console.log('Table created successfully'),
        (error) => console.error('Error creating table:', error)
      );
    });
  };

  useEffect(() => {
    createTable();
    fetchHistory();
  }, []);

  const insertCalculation = (expression: string, result: string): void => {
    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO calculation_history (expression, result) VALUES (?, ?)',
        [expression, result],
        () => {
          console.log('Data inserted successfully');
          fetchHistory();
        },
        (error) => console.error('Error inserting data:', error)
      );
    });
  };

  const fetchHistory = () => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM calculation_history ORDER BY timestamp DESC',
        [],
        (tx, results) => {
          let fetchedHistory: HistoryItem[] = [];
          for (let i = 0; i < results.rows.length; i++) {
            const item = results.rows.item(i);
            fetchedHistory.push({ id: item.id, expression: item.expression, result: item.result });
          }
          setHistory(fetchedHistory);
        },
        (error) => console.error('Error fetching data:', error)
      );
    });
  };

  const evaluateSquareRoots = (expression: string): string => {
    let newExpression = expression;
    let match;

    newExpression = newExpression.replace(/(\d)(√)/g, '$1*√');

    while ((match = newExpression.match(/√+/))) {
      const rootLength = match[0].length;
      const rootValueIndex = match.index! + rootLength;

      if (rootValueIndex < newExpression.length && /\d/.test(newExpression[rootValueIndex])) {
        let valueAfterRoot = '';
        let i = rootValueIndex;
        while (i < newExpression.length && /\d|\./.test(newExpression[i])) {
          valueAfterRoot += newExpression[i];
          i++;
        }
        let rootResult = parseFloat(valueAfterRoot);
        for (let j = 0; j < rootLength; j++) {
          rootResult = Math.sqrt(rootResult);
        }
        newExpression =
          newExpression.substring(0, match.index!) +
          rootResult.toString() +
          newExpression.substring(i);
      } else {
        return 'Error';
      }
    }

    newExpression = newExpression.replace(/÷/g, '/');
    return newExpression;
  };

  const calculateResult = (expression: string): string => {
    try {
      let sanitizedExpression = evaluateSquareRoots(expression);
      const result = eval(sanitizedExpression);
      if (result === Infinity || result === -Infinity || isNaN(result)) {
        return "Can't divide by zero";
      }
      return result.toString();
    } catch (error) {
      return 'Error';
    }
  };

  const buttonPressed = (buttonText: string): void => {
    if (buttonText === '.' && currentExpression === '0') {
      setCurrentExpression('0.');
      setDisplayText('0.');
      return;
    }
    if (buttonText === '.') {
      const lastNumber = currentExpression.split(/[+\-*÷]/).pop();
      if (lastNumber?.includes('.')) {
        return;
      }
      setCurrentExpression(currentExpression + '.');
      setDisplayText(currentExpression + '.');
      return;
    }
    if (operators.includes(buttonText) && operators.includes(currentExpression[currentExpression.length - 1])) {
      return;
    }
    if (buttonText === 'C') {
      setDisplayText('0');
      setCurrentExpression('0');
      setLastValidResult('');
      setIsFinalResultDisplayed(false);
    } else if (buttonText === '=') {
      if (isFinalResultDisplayed) {
        return;
      }
      try {
        const result = calculateResult(currentExpression);
        setDisplayText(result);
        setCurrentExpression(result);
        setLastValidResult('');
        insertCalculation(currentExpression, result);
        setIsFinalResultDisplayed(true);
      } catch (e) {
        setDisplayText('Error');
        setCurrentExpression('0');
        setIsFinalResultDisplayed(false);
      }
    } else if (buttonText === '%') {
      if (currentExpression !== '0') {
        try {
          const value = parseFloat(currentExpression);
          const percentageResult = (value / 100).toString();
          setDisplayText(percentageResult);
          setCurrentExpression(percentageResult);
          setLastValidResult(percentageResult);
        } catch (e) {
          setDisplayText('Error');
          setCurrentExpression('0');
          setLastValidResult('');
        }
      }
    } else if (buttonText === '⌫') {
      if (currentExpression.length > 1) {
        const updatedExpression = currentExpression.slice(0, -1);

        setCurrentExpression(updatedExpression);
        setDisplayText(updatedExpression);

        try {
          const result = calculateResult(updatedExpression);
          if (result !== 'Error') {
            setLastValidResult(result);
          }
        } catch {
          // Ignore errors for intermediate states
        }
      } else {
        setCurrentExpression('0');
        setDisplayText('0');
        setLastValidResult('');
      }
      setIsFinalResultDisplayed(false);
    } else if (buttonText === '√') {
      if (currentExpression === '0') {
        setCurrentExpression('√');
        setDisplayText('√');
      } else {
        const updatedExpression = `${currentExpression}√`;
        setCurrentExpression(updatedExpression);
        setDisplayText(updatedExpression);
      }
      setIsFinalResultDisplayed(false);
    } else {
      const lastSegment = currentExpression.split(/[+\-*÷]/).pop() || '';
      if (lastSegment.length >= maxSegmentLength && !operators.includes(buttonText)) {
        return;
      }

      if (isFinalResultDisplayed) {
        if (operators.includes(buttonText)) {
          setCurrentExpression(displayText + '\n' + buttonText);
          setDisplayText(displayText + '\n' + buttonText);
        } else {
          setCurrentExpression(buttonText);
          setDisplayText(buttonText);
        }
        setIsFinalResultDisplayed(false);
      } else {
        if (currentExpression === '0' && !operators.includes(buttonText)) {
          setCurrentExpression(buttonText);
          setDisplayText(buttonText);
          setLastValidResult(buttonText);
        } else if (buttonText === '-' && currentExpression === '0') {
          setCurrentExpression('-');
          setDisplayText('-');
        } else if (currentExpression === '0' && operators.includes(buttonText)) {
          setCurrentExpression(currentExpression + buttonText);
          setDisplayText(currentExpression + buttonText);
        } else {
          let updatedExpression;
          if (lastSegment.length >= maxSegmentLength && operators.includes(buttonText)) {
            updatedExpression = currentExpression + '\n' + buttonText;
          } else {
            updatedExpression = currentExpression + buttonText;
          }
          setCurrentExpression(updatedExpression);
          setDisplayText(updatedExpression);
          updateLastValidResult(updatedExpression);
        }
      }
    }
  };

  const updateLastValidResult = (expression: string): void => {
    if (expression && !operators.includes(expression[expression.length - 1])) {
      const result = calculateResult(expression);
      if (result && expression !== '0') {
        setLastValidResult(result);
      }
    } else if (expression.length === 1 && !operators.includes(expression) && expression !== '0') {
      setLastValidResult(expression);
    }
  };

  const buildButton = (buttonText: string, color: string = '#ffffff') => (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: color },
        buttonText === '=' ? styles.equalButton : null,
      ]}
      onPress={() => buttonPressed(buttonText)}
    >
      <Text style={[styles.buttonText, buttonText === '=' ? styles.equalButtonText : null]}>
        {buttonText}
      </Text>
    </TouchableOpacity>
  );

  const getDisplayFontSize = () => {
    const totalLength = displayText.length;
    if (totalLength > 90) return 14;
    if (totalLength > 60) return 18;
    if (totalLength > 40) return 24;
    return 32;
  };

  const handleDeleteSelectedItems = () => {
    Alert.alert(
      'Delete Confirmation',
      'Are you sure you want to delete these items?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            db.transaction((tx) => {
              selectedItems.forEach((id) => {
                tx.executeSql('DELETE FROM calculation_history WHERE id = ?', [id], () => {
                  console.log(`Deleted item with id ${id}`);
                });
              });
            }, undefined, () => {
              fetchHistory();
              setSelectedItems([]);
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAllItems = () => {
    Alert.alert(
      'Delete All Confirmation',
      'Are you sure you want to delete all history?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            db.transaction((tx) => {
              tx.executeSql('DELETE FROM calculation_history', [], () => {
                console.log('Deleted all history');
              });
            }, undefined, () => {
              fetchHistory();
              setSelectedItems([]);
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
      <View style={styles.container}>
        <View style={styles.displayContainer}>
          <Text style={[styles.displayText, { fontSize: getDisplayFontSize() }]}> {displayText} </Text>
          {!isFinalResultDisplayed && lastValidResult && (
            <Text style={[styles.displayText, { fontSize: getDisplayFontSize() - 4 }]}> = {lastValidResult} </Text>
          )}
        </View>
        <View style={styles.moreOptionsButtonContainer}>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Icon name="more-vert" size={30} color="#000000" />
          </TouchableOpacity>
        </View>
        {menuVisible && (
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setIsHistoryVisible(true);
                fetchHistory();
              }}
            >
              <Text style={styles.menuItemText}>History</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.buttonContainer}>
          <View style={styles.row}>{buildButton('C')}{buildButton('⌫')}{buildButton('%')}{buildButton('÷')}</View>
          <View style={styles.row}>{buildButton('7')}{buildButton('8')}{buildButton('9')}{buildButton('*')}</View>
          <View style={styles.row}>{buildButton('4')}{buildButton('5')}{buildButton('6')}{buildButton('-')}</View>
          <View style={styles.row}>{buildButton('1')}{buildButton('2')}{buildButton('3')}{buildButton('+')}</View>
          <View style={styles.row}>{buildButton('0')}{buildButton('.')}{buildButton('√')}{buildButton('=')}</View>
        </View>
        <Modal
          visible={isHistoryVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setIsHistoryVisible(false);
            setSelectedItems([]);
          }}
        >
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <TouchableOpacity onPress={() => {
                setIsHistoryVisible(false);
                setSelectedItems([]);
              }}>
                <Text style={styles.backButton}>&#8592;</Text>
              </TouchableOpacity>
              <Text style={styles.historyTitle}>History</Text>
              <TouchableOpacity onPress={handleDeleteAllItems}>
                <Text style={styles.deleteButton}>&#128465;</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {history.length > 0 ? (
                history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.historyItemContainer,
                      selectedItems.includes(item.id) && { backgroundColor: '#d3d3d3' },
                    ]}
                    onPress={() => {
                      if (selectedItems.includes(item.id)) {
                        setSelectedItems(selectedItems.filter((i) => i !== item.id));
                      } else {
                        setSelectedItems([...selectedItems, item.id]);
                      }
                    }}
                  >
                    <Text style={styles.historyDate}>{new Date().toLocaleDateString()}</Text>
                    <Text style={styles.historyItem}>{item.expression} = {item.result}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.historyItem}>No History Available</Text>
              )}
            </ScrollView>

            {selectedItems.length > 0 && (
              <View style={styles.historyActionButtons}>
                {selectedItems.length === 1 && (
                  <TouchableOpacity
                    style={styles.recalculateButton}
                    onPress={() => {
                      const selectedItem = history.find((item) => item.id === selectedItems[0]);
                      if (selectedItem) {
                        setCurrentExpression(selectedItem.expression);
                        setDisplayText(selectedItem.expression);
                        setIsFinalResultDisplayed(false);
                        setIsHistoryVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.recalculateButtonText}>Recalculate</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.deleteSelectedButton}
                  onPress={handleDeleteSelectedItems}
                >
                  <Text style={styles.deleteButtonText}>Delete Selected</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 16,
    justifyContent: 'flex-end',
  },
  displayContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginVertical: 20,
    borderRadius: 20,
    elevation: 5,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  displayText: {
    color: '#000000',
    textAlign: 'right',
  },
  buttonContainer: {
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    margin: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    elevation: 2,
  },
  buttonText: {
    fontSize: 24,
    color: '#000000',
  },
  equalButton: { backgroundColor: '#ffb6c1' },
  equalButtonText: { color: '#ffffff' },
  moreOptionsButtonContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  menuContainer: {
    position: 'absolute',
    top: 60,
    right: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 5,
    padding: 5,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 18,
    color: '#000000',
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
    justifyContent: 'flex-start',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  backButton: {
    fontSize: 24,
    color: '#ffffff',
  },
  deleteButton: {
    fontSize: 24,
    color: '#ffffff',
  },
  historyTitle: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  historyItemContainer: {
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  historyDate: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
  historyItem: {
    fontSize: 18,
    color: '#ffffff',
  },
  deleteSelectedButton: {
    backgroundColor: 'red',
    padding: 15,
    borderRadius: 10,
    margin: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  recalculateButton: {
    backgroundColor: '#008000',
    padding: 15,
    borderRadius: 10,
    margin: 10,
    alignItems: 'center',
  },
  recalculateButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});