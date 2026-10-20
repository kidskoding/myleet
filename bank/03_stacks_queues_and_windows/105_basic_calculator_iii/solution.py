def calculate(s: str) -> int:
    pos = 0

    def evaluate() -> int:
        nonlocal pos
        stack: list[int] = []
        num = 0
        op = "+"
        while pos < len(s):
            ch = s[pos]
            pos += 1
            if ch.isdigit():
                num = num * 10 + int(ch)
            elif ch == "(":
                num = evaluate()
            if ch in "+-*/)" or pos == len(s):
                if op == "+":
                    stack.append(num)
                elif op == "-":
                    stack.append(-num)
                elif op == "*":
                    stack.append(stack.pop() * num)
                else:
                    stack.append(int(stack.pop() / num))
                op = ch
                num = 0
                if ch == ")":
                    break
        return sum(stack)

    return evaluate()
