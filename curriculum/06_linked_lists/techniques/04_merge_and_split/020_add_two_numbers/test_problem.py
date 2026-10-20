from list_node import ListNode
from solution import add_two_numbers


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


def test_add_two_numbers_basic():
    result = add_two_numbers(build_list([2, 4, 3]), build_list([5, 6, 4]))
    assert to_list(result) == [7, 0, 8]


def test_add_two_numbers_carry_out():
    result = add_two_numbers(build_list([9, 9]), build_list([1]))
    assert to_list(result) == [0, 0, 1]


def test_add_two_numbers_zeros():
    result = add_two_numbers(build_list([0]), build_list([0]))
    assert to_list(result) == [0]
