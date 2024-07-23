import * as React from "react";
import {
  Button,
  Container,
  Form,
  InputGroup,
  Nav,
  Navbar,
} from "react-bootstrap";
import { Currency, CurrencyTable, currencies, isCurrency } from "./currency";

// @ts-expect-error ts(2552)
const git_hash: string = GIT_HASH;

let _currencyLoaded = false;
function useCurrencies(): {
  lastUpdate: string | null;
  allCurrencies: Currency[];
  convertionRate: (s: Currency, t: Currency) => number;
  isLoading: boolean;
} {
  const [table, setTable] = React.useState<CurrencyTable | null>(null);
  const [lastUpdate, setLastUpdate] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      if (_currencyLoaded) return;
      _currencyLoaded = true;

      const resp = await fetch("/data.json");
      const data = await resp.json();

      setTable(data.data);
      setLastUpdate(data.time);
    })();
  }, []);

  const toEUR = (c: Currency) => 1 / table[c];
  const fromEUR = (c: Currency) => 1 * table[c];

  return {
    lastUpdate,
    isLoading: table === null,
    allCurrencies: !!table
      ? (Object.keys(table) as Currency[])
      : (currencies as Currency[]),
    convertionRate: (s, t) => toEUR(s) * fromEUR(t),
  };
}

function CurrencyDropdown({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
}) {
  const { allCurrencies } = useCurrencies();

  return (
    <Form.Select
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (isCurrency(val)) onChange(val as Currency);
      }}
    >
      {allCurrencies.map((currency: Currency) => (
        <option key={currency}>{currency}</option>
      ))}
    </Form.Select>
  );
}

type PersistentCurrencyKey = "sourceCurrency" | "targetCurrency";

function usePersistentCurrency(
  defaultCurrency: Currency,
  key: PersistentCurrencyKey
): [Currency, React.Dispatch<React.SetStateAction<Currency>>] {
  const [val, setCurrency] = React.useState<Currency>(
    (localStorage.getItem(key) as Currency) || defaultCurrency
  );

  return [
    val,
    (newVal) => {
      localStorage.setItem(key, newVal as string);
      return setCurrency(newVal);
    },
  ];
}

export default function App() {
  const currencyInputRef = React.useRef(null);
  const { allCurrencies, convertionRate, isLoading, lastUpdate } =
    useCurrencies();

  const [sourceCurrency, setSourceCurrency] = usePersistentCurrency(
    "USD",
    "sourceCurrency"
  );
  const [targetCurrency, setTargetCurrency] = usePersistentCurrency(
    "EUR",
    "targetCurrency"
  );
  const [sourceValue, setSourceValue] = React.useState<number>(null);

  if (isLoading) return <p>Loading...</p>;

  const rate = convertionRate(sourceCurrency, targetCurrency);

  return (
    <>
      <header>
        <Navbar className="bg-body-tertiary">
          <Container>
            <Navbar.Brand>Price Pivot</Navbar.Brand>
            <Nav className="ms-auto">
              <Button
                variant="outline-secondary"
                onClick={() => {
                  localStorage.clear();
                  location.reload();
                }}
              >
                <i className="bi bi-x-octagon"></i>
              </Button>
            </Nav>
          </Container>
        </Navbar>
      </header>
      <main>
        <div id="currency-input">
          <InputGroup>
            <Form.Control
              ref={currencyInputRef}
              type="number"
              onChange={(e) => {
                setSourceValue(parseFloat(e.target.value) || null);
              }}
              placeholder="1.00"
            />
            <InputGroup.Text>{sourceCurrency}</InputGroup.Text>
            <Button
              variant="outline-secondary"
              onClick={() => {
                currencyInputRef.current.value = "";
                currencyInputRef.current.focus();
              }}
            >
              <i className="bi bi-x-circle"></i>
            </Button>
          </InputGroup>
          <Form.Text muted>
            Enter number dot separated. Example:&nbsp;2.95
          </Form.Text>
        </div>
        <div id="convertion-rate">x {rate.toFixed(4)}</div>
        <div id="currency-output">
          <InputGroup>
            <InputGroup.Text>=</InputGroup.Text>
            <Form.Control
              value={!!sourceValue ? (sourceValue * rate).toFixed(2) : ""}
              readOnly
              placeholder={rate.toFixed(2)}
            />
            <InputGroup.Text>{targetCurrency}</InputGroup.Text>
          </InputGroup>
        </div>

        <div id="currency-source">
          <CurrencyDropdown
            value={sourceCurrency}
            onChange={(v: Currency) => {
              setSourceCurrency(v);
              if (targetCurrency === v) {
                setTargetCurrency(allCurrencies.find((c) => v !== c));
              }
            }}
          />
        </div>
        <div id="currency-swapper">
          <Button
            onClick={() => {
              setSourceCurrency(targetCurrency);
              setTargetCurrency(sourceCurrency);
            }}
          >
            <i className="bi bi-arrow-left-right"></i>
          </Button>
        </div>
        <div id="currency-target">
          <CurrencyDropdown
            value={targetCurrency}
            onChange={(v: Currency) => {
              setTargetCurrency(v);
              if (sourceCurrency === v) {
                setSourceCurrency(allCurrencies.find((c) => v !== c));
              }
            }}
          />
        </div>
      </main>
      <footer>
        <p>
          <small>Last data update: {lastUpdate}</small>
        </p>
        <p>
          <small>{git_hash}</small>
        </p>
        <p>&copy; Sebastian Schulz, 2024</p>
      </footer>
    </>
  );
}
