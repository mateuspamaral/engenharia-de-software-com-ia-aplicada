export class UserService {
    async getDefaultUsers() {
        return this.getUsers();
    }

    async getUsers() {
        const response = await fetch('/api/users');
        const users = await response.json();
        return users;
    }

    async getUserById(userId) {
        const users = await this.getUsers();
        return users.find(user => user.id === userId);
    }

    async updateUser(user) {
        // Implementação simplificada; num cenário real, faria PUT /api/users/:id
        return user;
    }

    async addUser(user) {
        // Implementação simplificada; num cenário real, faria POST /api/users
    }
}
