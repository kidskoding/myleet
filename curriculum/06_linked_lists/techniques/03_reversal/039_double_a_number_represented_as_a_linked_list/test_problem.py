from list_node import ListNode
from solution import double_it


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_double_it_no_extra_digit():
    assert to_list(double_it(build_list([1, 8, 9]))) == [3, 7, 8]


def test_double_it_new_head_digit():
    assert to_list(double_it(build_list([9, 9, 9]))) == [1, 9, 9, 8]


def test_double_it_single_digit():
    assert to_list(double_it(build_list([5]))) == [1, 0]


def test_double_it_zero():
    assert to_list(double_it(build_list([0]))) == [0]
