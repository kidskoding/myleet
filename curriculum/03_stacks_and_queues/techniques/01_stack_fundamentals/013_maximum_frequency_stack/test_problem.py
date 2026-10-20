from solution import FreqStack


def test_freq_stack_pops_most_frequent_then_most_recent():
    stack = FreqStack()
    for value in [5, 7, 5, 7, 4, 5]:
        stack.push(value)

    assert stack.pop() == 5
    assert stack.pop() == 7
    assert stack.pop() == 5
    assert stack.pop() == 4


def test_freq_stack_single_value():
    stack = FreqStack()
    stack.push(7)
    stack.push(7)

    assert stack.pop() == 7
    assert stack.pop() == 7


def test_freq_stack_ties_go_to_most_recent():
    stack = FreqStack()
    stack.push(1)
    stack.push(2)

    assert stack.pop() == 2
    assert stack.pop() == 1
