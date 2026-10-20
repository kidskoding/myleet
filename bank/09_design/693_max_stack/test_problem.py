from solution import MaxStack


def test_max_stack_example():
    stack = MaxStack()
    stack.push(5)
    stack.push(1)
    stack.push(5)
    assert stack.top() == 5
    assert stack.pop_max() == 5
    assert stack.top() == 1
    assert stack.peek_max() == 5
    assert stack.pop() == 1
    assert stack.top() == 5


def test_max_stack_single_element():
    stack = MaxStack()
    stack.push(7)
    assert stack.top() == 7
    assert stack.peek_max() == 7
    assert stack.pop_max() == 7
    stack.push(3)
    assert stack.pop() == 3


def test_max_stack_pop_max_removes_topmost_copy():
    stack = MaxStack()
    for x in (2, 9, 4, 9, 1):
        stack.push(x)
    assert stack.pop_max() == 9
    assert stack.pop() == 1
    assert stack.pop() == 4
    assert stack.peek_max() == 9
    assert stack.top() == 9


def test_max_stack_pop_then_peek_max_skips_removed():
    stack = MaxStack()
    stack.push(1)
    stack.push(10)
    assert stack.pop() == 10
    assert stack.peek_max() == 1


def test_max_stack_negative_values():
    stack = MaxStack()
    for x in (-5, -2, -8):
        stack.push(x)
    assert stack.peek_max() == -2
    assert stack.pop_max() == -2
    assert stack.top() == -8
    assert stack.pop_max() == -5
    assert stack.pop() == -8
