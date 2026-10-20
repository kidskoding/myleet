def calculate_tax(brackets: list[list[int]], income: int) -> float:
    tax = 0.0
    previous = 0
    for upper, percent in brackets:
        taxed = min(income, upper) - previous
        if taxed <= 0:
            break
        tax += taxed * percent / 100
        previous = upper
    return tax
