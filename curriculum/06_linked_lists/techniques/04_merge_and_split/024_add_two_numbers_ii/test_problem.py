from list_node import ListNode
from solution import add_two_numbers_ii


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


def test_add_two_numbers_ii_normal():
    total = add_two_numbers_ii(build_list([7, 2, 4, 3]), build_list([5, 6, 4]))
    assert to_list(total) == [7, 8, 0, 7]


def test_add_two_numbers_ii_carry_out():
    total = add_two_numbers_ii(build_list([2, 4, 3]), build_list([5, 6, 4]))
    assert to_list(total) == [8, 0, 7]


def test_add_two_numbers_ii_zeros():
    assert to_list(add_two_numbers_ii(build_list([0]), build_list([0]))) == [0]
