class Cashier:
    def __init__(self, n: int, discount: int, products: list[int], prices: list[int]) -> None:
        self.n = n
        self.discount = discount
        self.price = dict(zip(products, prices))
        self.customers = 0

    def get_bill(self, product: list[int], amount: list[int]) -> float:
        self.customers += 1
        total = sum(self.price[p] * a for p, a in zip(product, amount))
        if self.customers % self.n == 0:
            return total * (100 - self.discount) / 100
        return float(total)
