from solution import MyStack


def test_my_stack_lifo_order():
    stack = MyStack()
    stack.push(1)
    stack.push(2)
    assert stack.top() == 2
    assert stack.pop() == 2
    assert stack.empty() is False


def test_my_stack_single_element():
    stack = MyStack()
    stack.push(9)
    assert stack.top() == 9
    assert stack.pop() == 9
    assert stack.empty() is True


def test_my_stack_empty_after_construction():
    stack = MyStack()
    assert stack.empty() is True


def test_my_stack_multiple_push_pop_cycles():
    stack = MyStack()
    stack.push(1)
    stack.push(2)
    stack.push(3)
    assert stack.pop() == 3
    stack.push(4)
    assert stack.pop() == 4
    assert stack.pop() == 2
    assert stack.pop() == 1
    assert stack.empty() is True
